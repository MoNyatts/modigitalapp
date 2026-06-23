<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Message;
use App\Services\CommunicationService;
use App\Services\ContactImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CommunicationController extends Controller
{
    // ─── Contacts ────────────────────────────────────────────────────────────

    public function contacts()
    {
        $contacts = Contact::orderBy('name')->paginate(50);
        $groups   = Contact::whereNotNull('group_tag')->distinct()->pluck('group_tag')->sort()->values();

        return view('communication.contacts', compact('contacts', 'groups'));
    }

    public function importContacts(Request $request, ContactImportService $importer)
    {
        $request->validate([
            'sheet' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
        ]);

        $result = $importer->import($request->file('sheet')->getRealPath(), $request->user());

        return back()
            ->with($result['imported'] > 0 ? 'status' : 'warning',
                "Imported {$result['imported']} contact(s), skipped {$result['skipped']}.")
            ->with('importErrors', array_slice($result['errors'], 0, 10));
    }

    public function contactTemplate()
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Contacts Template');
        $sheet->fromArray(['NAME', 'PHONE', 'EMAIL', 'GROUP'], null, 'A1');
        $sheet->fromArray([
            ['John Doe', '+255700000001', 'john@example.com', 'VIP'],
            ['Jane Smith', '+255700000002', 'jane@example.com', 'General'],
        ], null, 'A2');

        foreach (['A' => 20, 'B' => 16, 'C' => 26, 'D' => 14] as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        $tmp = tempnam(sys_get_temp_dir(), 'contacts-template');
        (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save($tmp);

        return response()->download($tmp, 'contacts-upload-template.xlsx')->deleteFileAfterSend(true);
    }

    public function deleteContact(Contact $contact)
    {
        $contact->delete();

        return back()->with('status', 'Contact deleted.');
    }

    public function deleteAllContacts(Request $request)
    {
        $group = $request->input('group');
        $query = Contact::query();

        if ($group) {
            $query->where('group_tag', $group);
        }

        $count = $query->count();
        $query->delete();

        return back()->with('status', "Deleted {$count} contact(s).");
    }

    // ─── Messages ─────────────────────────────────────────────────────────────

    public function messages()
    {
        $messages = Message::with('sender:id,name')
            ->withCount('contacts')
            ->orderByDesc('created_at')
            ->paginate(20);

        $groups = Contact::whereNotNull('group_tag')->distinct()->pluck('group_tag')->sort()->values();

        try {
            $balance = app(CommunicationService::class)->checkBalance();
        } catch (\Throwable) {
            $balance = null;
        }

        return view('communication.messages', compact('messages', 'groups', 'balance'));
    }

    public function messageDetail(Message $message)
    {
        $message->load(['sender:id,name', 'contacts' => fn($q) => $q->withPivot(['status', 'error', 'sent_at'])]);

        return view('communication.message-detail', compact('message'));
    }

    public function balance()
    {
        try {
            $balance = app(CommunicationService::class)->checkBalance();
            return response()->json(['balance' => $balance]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 503);
        }
    }

    public function compose(Request $request)
    {
        $data = $request->validate([
            'channel'         => ['required', 'in:sms,whatsapp,both'],
            'body'            => ['required', 'string', 'max:1600'],
            'recipient_mode'  => ['nullable', 'in:manual,contacts,group'],
            'manual_numbers'  => ['nullable', 'string'],
            'group_tag'       => ['nullable', 'string'],
            'contact_ids'     => ['nullable', 'array'],
            'contact_ids.*'   => ['integer', 'exists:contacts,id'],
            'attachment'      => ['nullable', 'file', 'max:10240'],
        ]);

        $contactIds = [];

        // ── Group mode ────────────────────────────────────────────────────────
        if (!empty($data['group_tag'])) {
            $contactIds = Contact::where('group_tag', $data['group_tag'])->pluck('id')->toArray();
        }

        // ── Contacts checkbox mode ────────────────────────────────────────────
        if (!empty($data['contact_ids'])) {
            $contactIds = array_unique(array_merge($contactIds, $data['contact_ids']));
        }

        // ── Manual numbers mode ───────────────────────────────────────────────
        if (!empty($data['manual_numbers'])) {
            $raw = preg_split('/[\s,;]+/', trim($data['manual_numbers']));
            foreach (array_filter($raw) as $raw_phone) {
                $phone = preg_replace('/[\s\-\(\)\+]/', '', trim($raw_phone));
                if (empty($phone)) continue;
                if (str_starts_with($phone, '0')) {
                    $phone = '255' . substr($phone, 1);
                }
                $contact = Contact::firstOrCreate(
                    ['phone' => $phone],
                    ['name' => $phone, 'created_by' => $request->user()->id]
                );
                $contactIds[] = $contact->id;
            }
            $contactIds = array_unique($contactIds);
        }

        if (empty($contactIds)) {
            return back()->withErrors(['contact_ids' => 'Add at least one recipient — enter a number, pick contacts, or select a group.'])->withInput();
        }

        $attachmentPath = null;
        $attachmentName = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachmentPath = $file->store('message-attachments', 'public');
            $attachmentName = $file->getClientOriginalName();
        }

        $message = Message::create([
            'channel'         => $data['channel'],
            'body'            => $data['body'],
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentName,
            'recipient_count' => count($contactIds),
            'status'          => 'pending',
            'sent_by'         => $request->user()->id,
        ]);

        $message->contacts()->attach($contactIds, ['status' => 'pending']);

        // Send synchronously (for large lists, dispatch a job instead)
        try {
            app(CommunicationService::class)->send($message);
        } catch (\Throwable $e) {
            $message->update(['status' => 'failed']);

            return back()->with('warning', 'Message queued but sending failed: ' . $e->getMessage());
        }

        return redirect()->route('communication.messages')
            ->with('status', "Message sent to {$message->sent_count} recipient(s).");
    }
}
