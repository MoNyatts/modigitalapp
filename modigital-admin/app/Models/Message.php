<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Message extends Model
{
    protected $fillable = [
        'channel', 'body', 'attachment_path', 'attachment_name',
        'recipient_count', 'sent_count', 'failed_count', 'status', 'sent_by',
        'beem_request_id',
    ];

    public function contacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'contact_message')
            ->withPivot(['status', 'error', 'sent_at']);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
