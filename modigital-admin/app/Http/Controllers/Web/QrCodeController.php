<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\QrCode;
use App\Services\QrImportService;
use chillerlan\QRCode\QRCode as QrGenerator;
use chillerlan\QRCode\QROptions;
use Illuminate\Http\Request;
use ZipArchive;

class QrCodeController extends Controller
{
    public function index(Event $event)
    {
        $qrCodes = $event->qrCodes()->withSum('scans as used', 'admission_count')->orderBy('code')->paginate(50);

        return view('qrcodes.index', compact('event', 'qrCodes'));
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
    public function downloadZip(Event $event)
    {
        $codes = $event->qrCodes()->get();
        abort_if($codes->isEmpty(), 404, 'No QR codes uploaded for this event.');

        $zipPath = tempnam(sys_get_temp_dir(), 'qrzip');
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::OVERWRITE);

        $options = new QROptions([
            'outputBase64' => false,
            'scale' => 10,
            'quietzoneSize' => 2,
        ]);

        foreach ($codes as $code) {
            $png = (new QrGenerator($options))->render($code->qr_hash);
            $safeName = preg_replace('/[^\w\- ]/', '', "{$code->code} - {$code->guest_name}");
            $zip->addFromString("QRCodes/{$safeName}.png", $png);
        }

        $zip->close();

        $fileName = preg_replace('/[^\w\- ]/', '', $event->name) . '-QRCodes.zip';

        return response()->download($zipPath, $fileName)->deleteFileAfterSend(true);
    }

    public function invalidate(Event $event, QrCode $qrCode)
    {
        abort_unless($qrCode->event_id === $event->id, 404);
        $qrCode->update(['is_valid' => !$qrCode->is_valid]);

        return back()->with('status', $qrCode->is_valid ? 'QR code re-validated.' : 'QR code invalidated.');
    }
}
