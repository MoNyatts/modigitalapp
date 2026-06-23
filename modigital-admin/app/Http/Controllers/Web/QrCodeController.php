<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\QrCode;
use App\Services\QrImportService;
use chillerlan\QRCode\Common\EccLevel;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode as QrGenerator;
use chillerlan\QRCode\QROptions;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
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
            'outputInterface' => QRGdImagePNG::class,
            'outputBase64' => false,
            'eccLevel' => EccLevel::M,
            'scale' => 10,
            'quietzoneSize' => 0,
        ]);

        $usedNames = [];
        foreach ($codes as $code) {
            $png = (new QrGenerator($options))->render($code->qr_hash);
            $safeName = trim(preg_replace('/[^\w\- ]/', '', "{$code->code} - {$code->guest_name}")) ?: $code->code;
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

        $fileName = preg_replace('/[^\w\- ]/', '', $event->name) . '-QRCodes.zip';

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
        abort_unless($qrCode->event_id === $event->id, 404);
        $qrCode->update(['is_valid' => !$qrCode->is_valid]);

        return back()->with('status', $qrCode->is_valid ? 'Card re-validated.' : 'Card invalidated.');
    }
}
