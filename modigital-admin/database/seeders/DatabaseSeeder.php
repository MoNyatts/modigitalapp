<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@modigitalevents.com'],
            [
                'name' => 'Administrator',
                'password' => 'Admin@123',
                'role' => 'admin',
                'scanner_enabled' => true,
            ],
        );
    }
}
