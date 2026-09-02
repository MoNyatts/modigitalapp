<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    /** Events the authenticated user may scan for, with their activities. */
    public function index(Request $request): JsonResponse
    {
        $events = $request->user()
            ->visibleEvents()
            ->withCount('qrCodes')
            ->withSum('qrCodes as guest_count', 'max_admissions')
            ->with(['activities' => fn ($query) => $query
                ->withCount(['scans', 'rejectedScans'])
                ->withSum('scans as admissions_sum', 'admission_count')])
            ->orderBy('start_date')
            ->get()
            ->map(function ($event) {
                $activities = $event->activities->map(function ($activity) {
                    $uniqueCodes = $activity->scans()->distinct('qr_code_id')->count('qr_code_id');

                    return [
                        'id' => $activity->id,
                        'name' => $activity->name,
                        'day' => $activity->day,
                        'start_time' => $activity->start_time,
                        'end_time' => $activity->end_time,
                        'is_active' => $activity->is_active,
                        'total_admissions' => (int) ($activity->admissions_sum ?? 0),
                        'total_scans' => (int) $activity->scans_count,
                        'unique_codes' => (int) $uniqueCodes,
                        'rejected_scans' => (int) $activity->rejected_scans_count,
                    ];
                });

                return [
                    'id' => $event->id,
                    'name' => $event->name,
                    'location' => $event->location,
                    'is_multi_day' => $event->is_multi_day,
                    'start_date' => $event->start_date->toDateString(),
                    'start_time' => $event->start_time,
                    'end_date' => $event->end_date?->toDateString(),
                    'end_time' => $event->end_time,
                    'opens_at' => $event->opensAt()?->toIso8601String(),
                    'closes_at' => $event->closesAt()?->toIso8601String(),
                    'invited_guests' => (int) ($event->guest_count ?? 0),
                    'guest_count' => (int) ($event->guest_count ?? 0),
                    'qr_codes_count' => (int) $event->qr_codes_count,
                    'total_admissions' => (int) $activities->sum('total_admissions'),
                    'total_scans' => (int) $activities->sum('total_scans'),
                    'unique_codes' => (int) $activities->sum('unique_codes'),
                    'rejected_scans' => (int) $activities->sum('rejected_scans'),
                    'activities' => $activities,
                ];
            });

        return response()->json(['events' => $events]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only administrators can create events'], 403);
        }

        $data = $this->validated($request);
        $activities = $data['activities'] ?? [];
        unset($data['activities']);

        $event = Event::create($data + ['created_by' => $request->user()->id]);

        foreach ($activities as $activity) {
            if (trim((string) ($activity['name'] ?? '')) !== '') {
                $event->activities()->create($activity + ['is_active' => true]);
            }
        }

        return response()->json(['event' => $this->serializeEvent($event->fresh())], 201);
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only administrators can update events'], 403);
        }

        $data = $this->validated($request);
        unset($data['activities']);
        $event->update($data);

        return response()->json(['event' => $this->serializeEvent($event->fresh())]);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only administrators can delete events'], 403);
        }

        $event->delete();

        return response()->json(['message' => 'Event deleted']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['required', 'string', 'max:255'],
            'is_multi_day' => ['sometimes', 'boolean'],
            'start_date' => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'activities' => ['sometimes', 'array'],
            'activities.*.name' => ['required_with:activities', 'string', 'max:255'],
            'activities.*.description' => ['nullable', 'string'],
            'activities.*.day' => ['nullable', 'integer', 'min:1', 'max:60'],
            'activities.*.start_time' => ['nullable', 'date_format:H:i'],
            'activities.*.end_time' => ['nullable', 'date_format:H:i'],
        ]) + ['is_multi_day' => $request->boolean('is_multi_day')];
    }

    private function serializeEvent(Event $event): array
    {
        $event->loadCount('qrCodes');
        $event->loadSum('qrCodes as guest_count', 'max_admissions');
        $event->load(['activities' => fn ($query) => $query
            ->withCount(['scans', 'rejectedScans'])
            ->withSum('scans as admissions_sum', 'admission_count')]);

        $activities = $event->activities->map(fn ($activity) => [
            'id' => $activity->id,
            'name' => $activity->name,
            'day' => $activity->day,
            'start_time' => $activity->start_time,
            'end_time' => $activity->end_time,
            'is_active' => $activity->is_active,
            'total_admissions' => (int) ($activity->admissions_sum ?? 0),
            'total_scans' => (int) $activity->scans_count,
            'unique_codes' => (int) $activity->scans()->distinct('qr_code_id')->count('qr_code_id'),
            'rejected_scans' => (int) $activity->rejected_scans_count,
        ]);

        return [
            'id' => $event->id,
            'name' => $event->name,
            'location' => $event->location,
            'is_multi_day' => $event->is_multi_day,
            'start_date' => $event->start_date->toDateString(),
            'start_time' => $event->start_time,
            'end_date' => $event->end_date?->toDateString(),
            'end_time' => $event->end_time,
            'opens_at' => $event->opensAt()?->toIso8601String(),
            'closes_at' => $event->closesAt()?->toIso8601String(),
            'invited_guests' => (int) ($event->guest_count ?? 0),
            'guest_count' => (int) ($event->guest_count ?? 0),
            'qr_codes_count' => (int) $event->qr_codes_count,
            'total_admissions' => (int) $activities->sum('total_admissions'),
            'total_scans' => (int) $activities->sum('total_scans'),
            'unique_codes' => (int) $activities->sum('unique_codes'),
            'rejected_scans' => (int) $activities->sum('rejected_scans'),
            'activities' => $activities,
        ];
    }
}
