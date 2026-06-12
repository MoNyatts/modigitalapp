<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Services\ScanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScanController extends Controller
{
    public function __construct(private readonly ScanService $scanService)
    {
    }

    /** Authorize that this user may scan for the activity's event. */
    private function authorizeActivity(Request $request, Activity $activity): ?JsonResponse
    {
        $user = $request->user();

        if (!$user->canScan()) {
            return response()->json(['message' => 'Scanner access is disabled for this account'], 403);
        }

        $allowed = $user->isAdmin()
            || $user->assignedEvents()->where('events.id', $activity->event_id)->exists();

        return $allowed ? null : response()->json(['message' => 'You are not assigned to this event'], 403);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'qr_data' => ['required', 'string', 'max:255'],
            'activity_id' => ['required', 'integer', 'exists:activities,id'],
            'admission_count' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $activity = Activity::findOrFail($data['activity_id']);

        if ($denied = $this->authorizeActivity($request, $activity)) {
            return $denied;
        }

        $result = $this->scanService->scan(
            $data['qr_data'],
            $activity,
            $request->user(),
            $data['admission_count'] ?? 1,
            $data['notes'] ?? null,
        );

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function status(Request $request): JsonResponse
    {
        $data = $request->validate([
            'qr_data' => ['required', 'string', 'max:255'],
            'activity_id' => ['required', 'integer', 'exists:activities,id'],
        ]);

        $activity = Activity::findOrFail($data['activity_id']);

        if ($denied = $this->authorizeActivity($request, $activity)) {
            return $denied;
        }

        return response()->json($this->scanService->status($data['qr_data'], $activity));
    }

    /** Live feed for an activity: recent admissions, rejections, and totals. Poll every ~5s. */
    public function feed(Request $request, Activity $activity): JsonResponse
    {
        if ($denied = $this->authorizeActivity($request, $activity)) {
            return $denied;
        }

        $scans = $activity->scans()
            ->with(['qrCode:id,code,guest_name,type', 'scanner:id,name'])
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'code' => $s->qrCode?->code,
                'guest_name' => $s->qrCode?->guest_name,
                'type' => $s->qrCode?->type,
                'admission_count' => $s->admission_count,
                'scanned_by' => $s->scanner?->name,
                'scanned_at' => $s->created_at->toIso8601String(),
            ]);

        $rejected = $activity->rejectedScans()
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'qr_code' => $r->qr_code_raw,
                'reason' => $r->reason,
                'scanned_at' => $r->created_at->toIso8601String(),
            ]);

        return response()->json([
            'total_admissions' => (int) $activity->scans()->sum('admission_count'),
            'total_scans' => $activity->scans()->count(),
            'unique_codes' => $activity->scans()->distinct('qr_code_id')->count('qr_code_id'),
            'scans' => $scans,
            'rejected' => $rejected,
        ]);
    }
}
