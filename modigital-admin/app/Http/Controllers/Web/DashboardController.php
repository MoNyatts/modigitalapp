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
        ]);
    }
}
