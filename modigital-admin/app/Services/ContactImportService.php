<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\User;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ContactImportService
{
    public function import(string $path, User $uploader): array
    {
        $spreadsheet = IOFactory::load($path);
        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        $imported = 0;
        $skipped = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            if ($index === 0) {
                continue; // skip header
            }

            $name  = trim((string) ($row[0] ?? ''));
            $phone = trim((string) ($row[1] ?? ''));
            $email = trim((string) ($row[2] ?? ''));
            $group = trim((string) ($row[3] ?? ''));

            if ($name === '') {
                $skipped++;
                continue;
            }

            if ($phone === '' && $email === '') {
                $errors[] = "Row " . ($index + 1) . ": '{$name}' skipped — needs phone or email.";
                $skipped++;
                continue;
            }

            Contact::create([
                'name'       => $name,
                'phone'      => $phone ?: null,
                'email'      => $email ?: null,
                'group_tag'  => $group ?: null,
                'created_by' => $uploader->id,
            ]);

            $imported++;
        }

        return compact('imported', 'skipped', 'errors');
    }
}
