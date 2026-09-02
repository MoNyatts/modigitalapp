<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\QrCode;
use App\Models\User;
use App\Services\QrImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use ZipArchive;

class QrCodeManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_qr_codes_can_be_searched_by_code_guest_phone_or_hash(): void
    {
        [$admin, $event] = $this->adminAndEvent();
        $this->qrCode($event, $admin, ['code' => 'S001', 'guest_name' => 'Mr & Mrs Moses', 'qr_hash' => 'MOSES001']);
        $this->qrCode($event, $admin, ['code' => 'D002', 'guest_name' => 'Dr. Filip', 'qr_hash' => 'FILIP002']);

        $this->actingAs($admin)
            ->get(route('qrcodes.index', [$event, 'search' => 'Mrs Moses']))
            ->assertOk()
            ->assertSee('Mr &amp; Mrs Moses', false)
            ->assertDontSee('Dr. Filip');

        $this->actingAs($admin)
            ->get(route('qrcodes.index', [$event, 'search' => 'FILIP002']))
            ->assertOk()
            ->assertSee('Dr. Filip');
    }

    public function test_import_preserves_special_characters_and_punctuation_in_guest_names(): void
    {
        [$admin, $event] = $this->adminAndEvent();
        $path = tempnam(sys_get_temp_dir(), 'qr-import-test');
        file_put_contents($path, "CODE NO,NAME,PHONE\nS001,\"Mr & Mrs Moses\",+255700000001\nS002,\"Dr. Filip\",+255700000002\nS003,\"Makung'uto – \"\"VIP\"\"\",+255700000003\n");

        $result = app(QrImportService::class)->import($path, $event, $admin);
        unlink($path);

        $this->assertSame(3, $result['imported']);
        $this->assertDatabaseHas('qr_codes', ['event_id' => $event->id, 'guest_name' => 'Mr & Mrs Moses']);
        $this->assertDatabaseHas('qr_codes', ['event_id' => $event->id, 'guest_name' => 'Dr. Filip']);
        $this->assertDatabaseHas('qr_codes', ['event_id' => $event->id, 'guest_name' => 'Makung\'uto – "VIP"']);
    }

    public function test_bulk_actions_only_change_selected_codes_from_the_current_event(): void
    {
        [$admin, $event] = $this->adminAndEvent();
        $otherEvent = $this->event($admin, 'Other event');
        $selected = $this->qrCode($event, $admin, ['code' => 'S001', 'qr_hash' => 'SELECT01']);
        $untouched = $this->qrCode($event, $admin, ['code' => 'S002', 'qr_hash' => 'UNTOUCH2']);
        $foreign = $this->qrCode($otherEvent, $admin, ['code' => 'S001', 'qr_hash' => 'FOREIGN1']);

        $this->actingAs($admin)->post(route('qrcodes.bulk', $event), [
            'action' => 'invalidate',
            'qr_code_ids' => [$selected->id, $foreign->id],
        ])->assertRedirect();

        $this->assertFalse($selected->fresh()->is_valid);
        $this->assertTrue($untouched->fresh()->is_valid);
        $this->assertTrue($foreign->fresh()->is_valid);

        $this->actingAs($admin)->post(route('qrcodes.bulk', $event), [
            'action' => 'delete',
            'qr_code_ids' => [$selected->id, $foreign->id],
        ])->assertRedirect();

        $this->assertModelMissing($selected);
        $this->assertModelExists($untouched);
        $this->assertModelExists($foreign);
    }

    public function test_downloaded_qr_names_keep_guest_punctuation_and_images_include_the_center_logo(): void
    {
        [$admin, $event] = $this->adminAndEvent();
        $qr = $this->qrCode($event, $admin, [
            'code' => 'S001',
            'guest_name' => 'Mr & Mrs Makung\'uto – "VIP"',
            'qr_hash' => 'PUNCT001',
        ]);

        $response = $this->actingAs($admin)->get(route('qrcodes.download-one', [$event, $qr]));

        $response->assertOk()->assertHeader('content-type', 'image/png');
        $this->assertStringContainsString(rawurlencode('S001 - Mr & Mrs Makung\'uto – "VIP".png'), $response->headers->get('content-disposition'));

        $image = imagecreatefromstring($response->getContent());
        $this->assertNotFalse($image);
        $centerX = intdiv(imagesx($image), 2);
        $centerY = intdiv(imagesy($image), 2);
        $rgb = imagecolorsforindex($image, imagecolorat($image, $centerX, $centerY + 15));
        $this->assertGreaterThan(180, $rgb['red']);
        $this->assertLessThan(120, $rgb['green']);
        $this->assertLessThan(120, $rgb['blue']);
        imagedestroy($image);

        $zipResponse = $this->actingAs($admin)->post(route('qrcodes.bulk', $event), [
            'action' => 'download',
            'qr_code_ids' => [$qr->id],
        ]);
        $zipResponse->assertOk();
        $zip = new ZipArchive();
        $this->assertTrue($zip->open($zipResponse->baseResponse->getFile()->getPathname()));
        $this->assertSame('QRCodes/S001 - Mr & Mrs Makung\'uto – "VIP".png', $zip->getNameIndex(0));
        $zip->close();
    }

    public function test_guest_count_is_derived_from_qr_admission_capacity_in_the_api(): void
    {
        [$admin, $event] = $this->adminAndEvent();
        $this->qrCode($event, $admin, ['code' => 'S001', 'type' => 'S', 'max_admissions' => 1, 'qr_hash' => 'SINGLE01']);
        $this->qrCode($event, $admin, ['code' => 'D001', 'type' => 'D', 'max_admissions' => 2, 'qr_hash' => 'DOUBLE01']);
        $this->qrCode($event, $admin, ['code' => 'M5001', 'type' => 'M', 'max_admissions' => 5, 'qr_hash' => 'GROUP005']);

        Sanctum::actingAs($admin);
        $this->getJson('/api/events')
            ->assertOk()
            ->assertJsonPath('events.0.invited_guests', 8)
            ->assertJsonPath('events.0.guest_count', 8)
            ->assertJsonPath('events.0.qr_codes_count', 3);
    }

    private function adminAndEvent(): array
    {
        $admin = User::create([
            'name' => 'QR Test Admin',
            'email' => 'qr-admin-'.uniqid().'@example.com',
            'password' => 'password',
            'role' => 'admin',
        ]);

        return [$admin, $this->event($admin)];
    }

    private function event(User $admin, string $name = 'Test event'): Event
    {
        return Event::create([
            'name' => $name,
            'location' => 'Dar es Salaam',
            'start_date' => now()->addDay()->toDateString(),
            'created_by' => $admin->id,
        ]);
    }

    private function qrCode(Event $event, User $admin, array $overrides = []): QrCode
    {
        return QrCode::create(array_merge([
            'event_id' => $event->id,
            'code' => 'S001',
            'guest_name' => 'Guest Name',
            'phone_number' => '+255700000000',
            'type' => 'S',
            'max_admissions' => 1,
            'qr_hash' => 'HASH0001',
            'is_valid' => true,
            'uploaded_by' => $admin->id,
        ], $overrides));
    }
}
