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
        'start_date', 'end_date', 'invited_guests', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_multi_day' => 'boolean',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
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
