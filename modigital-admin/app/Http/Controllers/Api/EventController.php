<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    /** Events the authenticated user may scan for, with their activities. */
    public function index(Request $request): JsonResponse
    {
        $events = $request->user()
            ->visibleEvents()
            ->with('activities')
            ->orderBy('start_date')
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->name,
                'location' => $e->location,
                'is_multi_day' => $e->is_multi_day,
                'start_date' => $e->start_date->toDateString(),
                'end_date' => $e->end_date?->toDateString(),
                'activities' => $e->activities->map(fn ($a) => [
                    'id' => $a->id,
                    'name' => $a->name,
                    'day' => $a->day,
                    'start_time' => $a->start_time,
                    'end_time' => $a->end_time,
                    'is_active' => $a->is_active,
                ]),
            ]);

        return response()->json(['events' => $events]);
    }
}
