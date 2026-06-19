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
            'guestCount' => QrCode::count(),
            'userCount' => User::count(),
            'admissionsToday' => (int) Scan::where('created_at', '>=', $today)->sum('admission_count'),
            'admissionsTotal' => (int) Scan::sum('admission_count'),
            'rejectionsToday' => RejectedScan::where('created_at', '>=', $today)->count(),
            'admissionsByDay' => $admissionsByDay,
            'eventPerformance' => $eventPerformance,
        ]);
    }

    public function admissions()
    {
        $today = now()->startOfDay();
        $recentScans = Scan::with([
            'qrCode:id,code,guest_name,type',
            'activity:id,name,event_id',
            'activity.event:id,name,start_date',
            'scanner:id,name,email',
        ])->latest()->paginate(25);

        return view('dashboard.admissions', [
            'recentScans' => $recentScans,
            'admissionsToday' => (int) Scan::where('created_at', '>=', $today)->sum('admission_count'),
            'admissionsTotal' => (int) Scan::sum('admission_count'),
            'scanCountToday' => Scan::where('created_at', '>=', $today)->count(),
            'scannerCountToday' => Scan::where('created_at', '>=', $today)->distinct('scanned_by')->count('scanned_by'),
        ]);
    }

    public function upcomingEvents()
    {
        $today = now()->startOfDay();
        $events = Event::withCount(['activities', 'qrCodes', 'assignedUsers'])
            ->whereDate('start_date', '>=', $today)
            ->orderBy('start_date')
            ->paginate(20);

        return view('dashboard.upcoming-events', [
            'events' => $events,
            'eventsThisWeek' => Event::whereBetween('start_date', [$today, now()->addDays(7)->endOfDay()])->count(),
            'eventsThisMonth' => Event::whereBetween('start_date', [$today, now()->endOfMonth()])->count(),
            'guestCapacity' => (int) Event::whereDate('start_date', '>=', $today)->sum('invited_guests'),
        ]);
    }
}
