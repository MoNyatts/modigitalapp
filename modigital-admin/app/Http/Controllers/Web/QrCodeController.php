<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\QrCode;
use App\Services\QrCodeImageService;
use App\Services\QrImportService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use ZipArchive;

class QrCodeController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $search = trim((string) $request->query('search', ''));
        $qrCodes = $event->qrCodes()
            ->withSum('scans as used', 'admission_count')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('code', 'like', "%{$search}%")
                        ->orWhere('guest_name', 'like', "%{$search}%")
                        ->orWhere('phone_number', 'like', "%{$search}%")
                        ->orWhere('qr_hash', 'like', "%{$search}%");
                });
            })
            ->orderBy('code')
            ->paginate(50)
            ->withQueryString();

        return view('qrcodes.index', compact('event', 'qrCodes', 'search'));
    }

    public function upload(Request $request, Event $event, QrImportService $importer)
    {
        $request->validate([
            'sheet' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'],
        ]);

        $result = $importer->import($request->file('sheet')->getRealPath(), $event, $request->user());

        $message = "Imported {$result['imported']} QR code(s), skipped {$result['skipped']}.";

        return back()
            ->with($result['imported'] > 0 ? 'status' : 'warning', $message)
            ->with('importErrors', array_slice($result['errors'], 0, 10));
    }

    /** Download all codes for an event as a ZIP of printable PNGs. */
    public function downloadZip(Event $event, QrCodeImageService $images)
    {
        $codes = $event->qrCodes()->get();
        abort_if($codes->isEmpty(), 404, 'No QR codes uploaded for this event.');

        return $this->downloadCodes($event, $codes, $images);
    }

    public function download(Event $event, QrCode $qrCode, QrCodeImageService $images)
    {
        $this->ensureBelongsToEvent($event, $qrCode);
        $fileName = $images->archiveName("{$qrCode->code} - {$qrCode->guest_name}", $qrCode->code).'.png';

        return response($images->render($qrCode->qr_hash), 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'attachment; filename="'.addcslashes($fileName, '"\\').'"; filename*=UTF-8\'\''.rawurlencode($fileName),
        ]);
    }

    public function bulk(Request $request, Event $event, QrCodeImageService $images)
    {
        $data = $request->validate([
            'action' => ['required', 'in:download,delete,invalidate,validate'],
            'qr_code_ids' => ['required', 'array', 'min:1'],
            'qr_code_ids.*' => ['integer'],
        ]);

        $codes = $event->qrCodes()->whereKey($data['qr_code_ids'])->get();

        if ($codes->isEmpty()) {
            return back()->with('warning', 'Select at least one QR code.');
        }

        if ($data['action'] === 'download') {
            return $this->downloadCodes($event, $codes, $images, 'Selected');
        }

        if ($data['action'] === 'delete') {
            $count = $codes->count();
            $event->qrCodes()->whereKey($codes->modelKeys())->delete();

            return back()->with('status', "Deleted {$count} QR code(s).");
        }

        $isValid = $data['action'] === 'validate';
        $event->qrCodes()->whereKey($codes->modelKeys())->update(['is_valid' => $isValid]);

        return back()->with('status', $codes->count().' QR code(s) '.($isValid ? 'validated.' : 'invalidated.'));
    }

    private function downloadCodes(Event $event, Collection $codes, QrCodeImageService $images, string $label = 'QRCodes')
    {
        $zipPath = tempnam(sys_get_temp_dir(), 'qrzip');
        $zip = new ZipArchive();
        abort_unless($zip->open($zipPath, ZipArchive::OVERWRITE) === true, 500, 'Unable to create QR code archive.');

        $usedNames = [];
        foreach ($codes as $code) {
            $png = $images->render($code->qr_hash);
            $safeName = $images->archiveName("{$code->code} - {$code->guest_name}", $code->code);
            $baseName = $safeName;
            $counter = 2;
            while (isset($usedNames[$safeName])) {
                $safeName = "{$baseName} {$counter}";
                $counter++;
            }
            $usedNames[$safeName] = true;
            $zip->addFromString("QRCodes/{$safeName}.png", $png);
        }

        $zip->close();

        $eventName = $images->archiveName($event->name, 'Event');
        $fileName = "{$eventName}-{$label}.zip";

        return response()->download($zipPath, $fileName)->deleteFileAfterSend(true);
    }

    public function template()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Guest Upload Template');
        $sheet->fromArray(['CODE NO', 'NAME', 'PHONE'], null, 'A1');
        $sheet->fromArray([
            ['S001', 'Single Guest Example', '+255700000001'],
            ['D001', 'Double Guest Example', '+255700000002'],
            ['M5001', 'Group Of Five Example', '+255700000003'],
            ['M10001', 'Group Of Ten Example', '+255700000004'],
        ], null, 'A2');

        foreach (['A' => 18, 'B' => 30, 'C' => 18] as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }

        $tmp = tempnam(sys_get_temp_dir(), 'guest-template');
        (new Xlsx($spreadsheet))->save($tmp);

        return response()->download($tmp, 'guest-upload-template.xlsx')->deleteFileAfterSend(true);
    }

    public function invalidate(Event $event, QrCode $qrCode)
    {
        $this->ensureBelongsToEvent($event, $qrCode);
        $qrCode->update(['is_valid' => !$qrCode->is_valid]);

        return back()->with('status', $qrCode->is_valid ? 'Card re-validated.' : 'Card invalidated.');
    }

    private function ensureBelongsToEvent(Event $event, QrCode $qrCode): void
    {
        abort_unless($qrCode->event_id === $event->id, 404);
    }
}
