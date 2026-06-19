<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\QrCode;
use App\Models\RejectedScan;
use App\Models\Scan;
use App\Models\User;

class DashboardController extends Controller
{
    public function index()
    {
        $today = now()->startOfDay();
        $weekStart = now()->subDays(6)->startOfDay();
        $admissionsByDay = collect(range(0, 6))->map(function ($offset) use ($weekStart) {
            $day = $weekStart->copy()->addDays($offset);

            return [
                'label' => $day->format('D'),
                'value' => (int) Scan::whereDate('created_at', $day->toDateString())->sum('admission_count'),
            ];
        });

        $eventPerformance = Event::orderByDesc('start_date')->limit(6)->get()
            ->map(fn (Event $event) => [
                'name' => $event->name,
                'admissions' => (int) Scan::whereHas('activity', fn ($query) => $query->where('event_id', $event->id))->sum('admission_count'),
                'qr_codes' => $event->qrCodes()->count(),
            ]);

        return view('dashboard', [
            'eventCount' => Event::count(),
            'upcomingEvents' => Event::whereDate('start_date', '>=', $today)->orderBy('start_date')->limit(5)->get(),
            'guestCount' => QrCode::count(),
            'userCount' => User::count(),
            'admissionsToday' => (int) Scan::where('created_at', '>=', $today)->sum('admission_count'),
            'admissionsTotal' => (int) Scan::sum('admission_count'),
            'rejectionsToday' => RejectedScan::where('created_at', '>=', $today)->count(),
            'recentScans' => Scan::with(['qrCode:id,code,guest_name', 'activity:id,name,event_id', 'activity.event:id,name', 'scanner:id,name'])
                ->latest()->limit(10)->get(),
            'admissionsByDay' => $admissionsByDay,
            'eventPerformance' => $eventPerformance,
        ]);
    }
}
