<?php

namespace App\Services;

use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CommunicationService
{
    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    public function send(Message $message): void
    {
        $message->update(['status' => 'sending']);

        $contacts    = $message->contacts()->get();
        $sentCount   = 0;
        $failedCount = 0;
        $beemReqId   = null;

        // ── SMS: single batch call to Beem (up to 1000 per call) ─────────────
        if (in_array($message->channel, ['sms', 'both'], true)) {
            $smsBatch = $contacts->filter(fn($c) => !empty($c->phone))->values();

            foreach ($smsBatch->chunk(1000) as $chunk) {
                try {
                    $res   = $this->sendSmsBatch($chunk->all(), $message->body);
                    $ok    = ($res['code'] ?? null) == 100 || ($res['successful'] ?? false) == true;
                    $error = $ok ? null : ($res['message'] ?? 'Beem error code ' . ($res['code'] ?? '?'));

                    if (!$beemReqId && isset($res['request_id'])) {
                        $beemReqId = (string) $res['request_id'];
                    }

                    foreach ($chunk as $contact) {
                        if ($ok) {
                            $sentCount++;
                            $message->contacts()->updateExistingPivot($contact->id, [
                                'status'  => 'sent',
                                'sent_at' => now(),
                                'error'   => null,
                            ]);
                        } else {
                            $failedCount++;
                            $message->contacts()->updateExistingPivot($contact->id, [
                                'status' => 'failed',
                                'error'  => $error,
                            ]);
                        }
                    }
                } catch (\Throwable $e) {
                    Log::error('Beem SMS batch failed', ['error' => $e->getMessage()]);
                    foreach ($chunk as $contact) {
                        $failedCount++;
                        $message->contacts()->updateExistingPivot($contact->id, [
                            'status' => 'failed',
                            'error'  => $e->getMessage(),
                        ]);
                    }
                }
            }
        }

        // ── WhatsApp: per-contact (API docs pending, credentials configured) ─
        if (in_array($message->channel, ['whatsapp', 'both'], true)) {
            foreach ($contacts as $contact) {
                if (empty($contact->phone)) continue;

                $alreadyCounted = $message->channel === 'both';

                try {
                    $this->sendWhatsApp($contact->phone, $message->body, $message->attachment_path);
                    if (!$alreadyCounted) {
                        $sentCount++;
                        $message->contacts()->updateExistingPivot($contact->id, [
                            'status'  => 'sent',
                            'sent_at' => now(),
                            'error'   => null,
                        ]);
                    }
                } catch (\Throwable $e) {
                    Log::error('WhatsApp send failed', ['phone' => $contact->phone, 'error' => $e->getMessage()]);
                    if (!$alreadyCounted) {
                        $failedCount++;
                        $message->contacts()->updateExistingPivot($contact->id, [
                            'status' => 'failed',
                            'error'  => $e->getMessage(),
                        ]);
                    }
                }
            }
        }

        $message->update([
            'sent_count'       => $sentCount,
            'failed_count'     => $failedCount,
            'status'           => $failedCount === 0 ? 'done' : ($sentCount === 0 ? 'failed' : 'done'),
            'beem_request_id'  => $beemReqId,
        ]);
    }

    public function checkBalance(): float
    {
        $auth = $this->beemBasicAuth();

        $response = Http::withHeaders([
                'Authorization' => "Basic {$auth}",
                'Content-Type'  => 'application/json',
            ])
            ->withoutVerifying()
            ->get('https://apisms.beem.africa/public/v1/vendors/balance');

        return (float) ($response->json('data.credit_balance') ?? 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    protected function sendSmsBatch(array $contacts, string $body): array
    {
        $auth      = $this->beemBasicAuth();
        $senderId  = config('communication.beem_sender_id', 'MoDigital');

        $recipients = array_map(fn($c) => [
            'recipient_id' => $c->id,
            'dest_addr'    => $this->normalizePhone($c->phone),
        ], $contacts);

        $response = Http::withHeaders([
                'Authorization' => "Basic {$auth}",
                'Content-Type'  => 'application/json',
            ])
            ->withoutVerifying()   // Beem sample disables SSL verification
            ->post('https://apisms.beem.africa/v1/send', [
                'source_addr'   => $senderId,
                'schedule_time' => '',
                'encoding'      => 0,
                'message'       => $body,
                'recipients'    => $recipients,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Beem HTTP error ' . $response->status() . ': ' . $response->body());
        }

        return $response->json();
    }

    protected function sendWhatsApp(string $phone, string $body, ?string $attachmentPath): void
    {
        // Credentials configured — awaiting WhatsApp API documentation.
        // $apiKey    = config('communication.whatsapp_api_key');   // modigital
        // $secretKey = config('communication.whatsapp_secret_key'); // BnRETnyTY9FusyK
        throw new \RuntimeException('WhatsApp API documentation not yet provided. Credentials are configured — add the endpoint and payload format when available.');
    }

    protected function beemBasicAuth(): string
    {
        $apiKey    = config('communication.beem_api_key');
        $secretKey = config('communication.beem_secret_key');

        if (!$apiKey || !$secretKey) {
            throw new \RuntimeException('Beem API credentials not configured. Add BEEM_API_KEY and BEEM_SECRET_KEY to .env');
        }

        return base64_encode("{$apiKey}:{$secretKey}");
    }

    protected function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[\s\-\(\)\+]/', '', $phone);

        // Leading 0 → assume Tanzania 255
        if (str_starts_with($phone, '0')) {
            $phone = '255' . substr($phone, 1);
        }

        return $phone;
    }
}
