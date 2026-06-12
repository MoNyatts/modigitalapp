<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'role', 'scanner_enabled'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'scanner_enabled' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function canScan(): bool
    {
        return $this->isAdmin() || $this->scanner_enabled;
    }

    /** Events this (staff) user is assigned to scan for. */
    public function assignedEvents(): BelongsToMany
    {
        return $this->belongsToMany(Event::class);
    }

    /** Events visible to this user: all for admins, assigned for staff. */
    public function visibleEvents()
    {
        return $this->isAdmin() ? Event::query() : $this->assignedEvents()->getQuery();
    }
}
