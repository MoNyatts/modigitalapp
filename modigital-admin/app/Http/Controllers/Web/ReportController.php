<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Event;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ReportController extends Controller
{
    public function index()
    {
        $events = Event::withCount('qrCodes')->orderByDesc('start_date')->get();

        return view('reports.index', compact('events'));
    }

    public function show(Event $event)
    {
        $event->load('activities');

        $activityReports = $event->activities->map(function ($activity) {
            $scans = $activity->scans()->with(['qrCode:id,code,guest_name,type', 'scanner:id,name'])->latest()->get();

            return [
                'activity' => $activity,
                'total_admissions' => (int) $scans->sum('admission_count'),
                'unique_codes' => $scans->pluck('qr_code_id')->unique()->count(),
                'scans' => $scans,
                'rejected' => $activity->rejectedScans()->latest()->limit(100)->get(),
            ];
        });

        return view('reports.show', compact('event', 'activityReports'));
    }

    public function export(Event $event)
    {
        $event->load('activities');
        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);

        foreach ($event->activities as $i => $activity) {
            $sheet = $spreadsheet->createSheet($i);
            $sheet->setTitle(substr(preg_replace('/[\\\\\/\?\*\[\]:]/', '', $activity->name) ?: "Activity {$i}", 0, 31));

            $sheet->fromArray(['QR Code', 'Guest Name', 'Type', 'Admitted', 'Scanned By', 'Scanned At'], null, 'A1');

            $row = 2;
            $scans = $activity->scans()->with(['qrCode:id,code,guest_name,type', 'scanner:id,name'])->oldest()->get();
            foreach ($scans as $scan) {
                $sheet->fromArray([
                    $scan->qrCode?->code,
                    $scan->qrCode?->guest_name,
                    $scan->qrCode?->type,
                    $scan->admission_count,
                    $scan->scanner?->name,
                    $scan->created_at->format('Y-m-d H:i:s'),
                ], null, "A{$row}");
                $row++;
            }

            $sheet->fromArray(['', '', 'TOTAL', (int) $scans->sum('admission_count')], null, "A" . ($row + 1));

            foreach (['A' => 14, 'B' => 28, 'C' => 8, 'D' => 10, 'E' => 18, 'F' => 20] as $col => $width) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }
        }

        if ($event->activities->isEmpty()) {
            $spreadsheet->createSheet(0)->setTitle('Report');
        }

        $fileName = preg_replace('/[^\w\- ]/', '', $event->name) . '-Report-' . now()->format('Y-m-d') . '.xlsx';
        $tmp = tempnam(sys_get_temp_dir(), 'report');
        (new Xlsx($spreadsheet))->save($tmp);

        return response()->download($tmp, $fileName)->deleteFileAfterSend(true);
    }
}
