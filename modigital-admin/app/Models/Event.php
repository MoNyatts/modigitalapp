<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Event extends Model
{
    protected $fillable = [
        'name', 'description', 'location', 'is_multi_day',
        'start_date', 'start_time', 'end_date', 'end_time',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_multi_day' => 'boolean',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    /** Returns the datetime at which this event opens for scanning, or null if no restriction. */
    public function opensAt(): ?\Carbon\Carbon
    {
        if (!$this->start_date) {
            return null;
        }

        $date = $this->start_date->toDateString();
        $time = $this->start_time ?? '00:00:00';

        return \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', "$date $time");
    }

    /** Returns the datetime after which scanning closes, or null if no restriction. */
    public function closesAt(): ?\Carbon\Carbon
    {
        if (!$this->end_date && !$this->end_time) {
            return null;
        }

        $date = ($this->end_date ?? $this->start_date)->toDateString();
        $time = $this->end_time ?? '23:59:59';

        return \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', "$date $time");
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class)->orderBy('day')->orderBy('start_time');
    }

    public function qrCodes(): HasMany
    {
        return $this->hasMany(QrCode::class);
    }

    public function scans(): HasManyThrough
    {
        return $this->hasManyThrough(Scan::class, QrCode::class);
    }

    public function assignedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
