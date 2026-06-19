<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\RejectedScan;
use App\Models\Scan;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ReportController extends Controller
{
    public function index()
    {
        $events = Event::withCount(['activities', 'qrCodes'])->orderByDesc('start_date')->get()
            ->map(function (Event $event) {
                $event->total_admissions = (int) Scan::whereHas('activity', fn ($query) => $query->where('event_id', $event->id))
                    ->sum('admission_count');
                $event->total_scans = Scan::whereHas('activity', fn ($query) => $query->where('event_id', $event->id))->count();
                $event->rejected_scans_count = RejectedScan::whereHas('activity', fn ($query) => $query->where('event_id', $event->id))->count();

                return $event;
            });

        $summary = [
            'events' => $events->count(),
            'activities' => (int) $events->sum('activities_count'),
            'qr_codes' => (int) $events->sum('qr_codes_count'),
            'admissions' => (int) $events->sum('total_admissions'),
            'rejections' => (int) $events->sum('rejected_scans_count'),
        ];

        $topEvents = $events->sortByDesc('total_admissions')->take(6)->values();

        return view('reports.index', compact('events', 'summary', 'topEvents'));
    }

    public function show(Event $event)
    {
        $event->load('activities');

        $activityReports = $event->activities->map(function ($activity) {
            $scans = $activity->scans()->with(['qrCode:id,code,guest_name,type', 'scanner:id,name'])->latest()->get();

            return [
                'activity' => $activity,
                'total_admissions' => (int) $scans->sum('admission_count'),
                'total_scans' => $scans->count(),
                'unique_codes' => $scans->pluck('qr_code_id')->unique()->count(),
                'scans' => $scans,
                'rejected' => $activity->rejectedScans()->latest()->limit(100)->get(),
            ];
        });

        $totals = [
            'activities' => $activityReports->count(),
            'admissions' => (int) $activityReports->sum('total_admissions'),
            'scans' => (int) $activityReports->sum('total_scans'),
            'unique_codes' => Scan::whereHas('activity', fn ($query) => $query->where('event_id', $event->id))
                ->distinct('qr_code_id')
                ->count('qr_code_id'),
            'rejections' => (int) $activityReports->sum(fn ($report) => $report['rejected']->count()),
        ];

        $activityChart = $activityReports->map(fn ($report) => [
            'name' => $report['activity']->name,
            'admissions' => $report['total_admissions'],
            'rejections' => $report['rejected']->count(),
        ]);

        $recentScans = Scan::whereHas('activity', fn ($query) => $query->where('event_id', $event->id))
            ->with(['qrCode:id,code,guest_name,type', 'activity:id,name,event_id', 'scanner:id,name'])
            ->latest()
            ->limit(12)
            ->get();

        return view('reports.show', compact('event', 'activityReports', 'totals', 'activityChart', 'recentScans'));
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
