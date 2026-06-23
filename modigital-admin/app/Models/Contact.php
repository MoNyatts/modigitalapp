<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Contact extends Model
{
    protected $fillable = ['name', 'phone', 'email', 'group_tag', 'notes', 'created_by'];

    public function messages(): BelongsToMany
    {
        return $this->belongsToMany(Message::class, 'contact_message')
            ->withPivot(['status', 'error', 'sent_at'])
            ->withTimestamps();
    }
}
