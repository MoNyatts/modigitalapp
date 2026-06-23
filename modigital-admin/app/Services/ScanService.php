<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\QrCode;
use App\Models\RejectedScan;
use App\Models\Scan;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Atomic, multi-device-safe QR admission.
 *
 * The decisive read of the QR code row uses SELECT … FOR UPDATE inside a
 * transaction, so two scanners hitting the same code at the same instant are
 * serialized by PostgreSQL — the second one sees the first one's admission
 * and is rejected. No double admissions, ever.
 */
class ScanService
{
    /**
     * @return array{success: bool, message: string, guest_name: ?string,
     *               remaining: int, max_admissions: int, scan_id: ?int}
     */
    public function scan(
        string $qrData,
        Activity $activity,
        User $scanner,
        int $admissionCount = 1,
        ?string $notes = null,
    ): array {
        $qrData = trim($qrData);

        return DB::transaction(function () use ($qrData, $activity, $scanner, $admissionCount, $notes) {
            $now = now();
            $event = $activity->event;

            if ($event && ($opensAt = $event->opensAt()) && $now->lt($opensAt)) {
                $formatted = $opensAt->format('d M Y \a\t H:i');
                return $this->result(false, "Event opens on {$formatted}", null, 0, 0);
            }

            if ($event && ($closesAt = $event->closesAt()) && $now->gt($closesAt)) {
                return $this->result(false, 'This event has ended', null, 0, 0);
            }

            $qrCode = $this->resolveAndLock($qrData, $activity->event_id);

            if (!$qrCode) {
                $this->reject($qrData, null, $activity, $scanner, $admissionCount, 'Card not found for this event');
                return $this->result(false, 'Card not found for this event', null, 0, 0);
            }

            if (!$qrCode->is_valid) {
                $this->reject($qrData, $qrCode->id, $activity, $scanner, $admissionCount, 'Card has been invalidated');
                return $this->result(false, 'Card has been invalidated', $qrCode->guest_name, 0, $qrCode->max_admissions);
            }

            $used = $qrCode->usedForActivity($activity->id);
            $remaining = $qrCode->max_admissions - $used;

            if ($remaining <= 0) {
                $this->reject($qrData, $qrCode->id, $activity, $scanner, $admissionCount, 'Card already fully used');
                return $this->result(false, "Card already used — all {$qrCode->max_admissions} admission(s) consumed", $qrCode->guest_name, 0, $qrCode->max_admissions);
            }

            if ($admissionCount > $remaining) {
                $this->reject($qrData, $qrCode->id, $activity, $scanner, $admissionCount, "Only {$remaining} admission(s) remaining");
                return $this->result(false, "Only {$remaining} admission(s) remaining on this card", $qrCode->guest_name, $remaining, $qrCode->max_admissions);
            }

            $scan = Scan::create([
                'qr_code_id' => $qrCode->id,
                'activity_id' => $activity->id,
                'scanned_by' => $scanner->id,
                'admission_count' => $admissionCount,
                'notes' => $notes,
            ]);

            return $this->result(
                true,
                "Admitted {$admissionCount} guest(s) — {$qrCode->guest_name}",
                $qrCode->guest_name,
                $remaining - $admissionCount,
                $qrCode->max_admissions,
                $scan->id,
            );
        });
    }

    /** Live status of a code without admitting anyone. */
    public function status(string $qrData, Activity $activity): array
    {
        $qrCode = $this->resolve(trim($qrData), $activity->event_id);

        if (!$qrCode) {
            return ['found' => false, 'message' => 'Card not found for this event'];
        }

        $used = $qrCode->usedForActivity($activity->id);

        return [
            'found' => true,
            'guest_name' => $qrCode->guest_name,
            'code' => $qrCode->code,
            'type' => $qrCode->type,
            'is_valid' => $qrCode->is_valid,
            'max_admissions' => $qrCode->max_admissions,
            'used' => $used,
            'remaining' => max(0, $qrCode->max_admissions - $used),
        ];
    }

    /**
     * A scanned QR image contains the hash; a manually typed code is the
     * code number ("S001" or "S001 - John Doe").
     */
    private function resolve(string $qrData, int $eventId): ?QrCode
    {
        return $this->query($qrData, $eventId)->first();
    }

    private function resolveAndLock(string $qrData, int $eventId): ?QrCode
    {
        return $this->query($qrData, $eventId)->lockForUpdate()->first();
    }

    private function query(string $qrData, int $eventId)
    {
        $codePart = strtoupper(trim(str_contains($qrData, ' - ') ? strstr($qrData, ' - ', true) : $qrData));

        return QrCode::where('event_id', $eventId)
            ->where(function ($q) use ($qrData, $codePart) {
                $q->where('qr_hash', $qrData)->orWhere('code', $codePart);
            });
    }

    private function reject(string $raw, ?int $qrCodeId, Activity $activity, User $scanner, int $count, string $reason): void
    {
        RejectedScan::create([
            'qr_code_raw' => $raw,
            'qr_code_id' => $qrCodeId,
            'activity_id' => $activity->id,
            'scanned_by' => $scanner->id,
            'attempted_count' => $count,
            'reason' => $reason,
        ]);
    }

    private function result(bool $success, string $message, ?string $guest, int $remaining, int $max, ?int $scanId = null): array
    {
        return [
            'success' => $success,
            'message' => $message,
            'guest_name' => $guest,
            'remaining' => $remaining,
            'max_admissions' => $max,
            'scan_id' => $scanId,
        ];
    }
}
