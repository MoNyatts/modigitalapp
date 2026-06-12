<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QrCode extends Model
{
    protected $fillable = [
        'event_id', 'code', 'guest_name', 'phone_number',
        'type', 'max_admissions', 'qr_hash', 'is_valid', 'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'is_valid' => 'boolean',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function scans(): HasMany
    {
        return $this->hasMany(Scan::class);
    }

    /** Total admissions already used for a given activity. */
    public function usedForActivity(int $activityId): int
    {
        return (int) $this->scans()->where('activity_id', $activityId)->sum('admission_count');
    }

    /**
     * Derive type and max admissions from a code like S001 / D012 / M5003.
     * M-codes embed the size directly after the M (M5… = 5, M10… = 10).
     */
    public static function parseCode(string $code): array
    {
        $code = strtoupper(trim($code));
        $type = substr($code, 0, 1);

        if ($type === 'D') {
            return ['type' => 'D', 'max' => 2];
        }
        if ($type === 'M') {
            if (preg_match('/^M(\d+)/', $code, $m)) {
                $max = (int) $m[1];
                // M10002 is ambiguous (M10 + 002 or M1 + 0002): prefer 10 / 5 prefixes.
                if (str_starts_with($m[1], '10')) {
                    $max = 10;
                } elseif (strlen($m[1]) > 2) {
                    $max = (int) substr($m[1], 0, 1);
                }
                return ['type' => 'M', 'max' => max(1, $max)];
            }
            return ['type' => 'M', 'max' => 1];
        }

        return ['type' => 'S', 'max' => 1];
    }
}
