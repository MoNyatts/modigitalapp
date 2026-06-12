<?php

namespace Database\Seeders;

use App\Models\Event;
use Illuminate\Database\Seeder;

/** Local-development demo data: one event, one activity, one single-use code. */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $event = Event::firstOrCreate(
            ['name' => 'Demo Gala'],
            ['location' => 'Test Hall', 'start_date' => now()->toDateString(), 'created_by' => 1],
        );

        $event->activities()->firstOrCreate(['name' => 'Main Entrance']);

        $event->qrCodes()->firstOrCreate(
            ['code' => 'S001'],
            ['guest_name' => 'John Doe', 'type' => 'S', 'max_admissions' => 1, 'qr_hash' => 'TESTHASH'],
        );
    }
}
