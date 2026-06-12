<?php

namespace App\Services;

use App\Models\Event;
use App\Models\QrCode;
use App\Models\User;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Imports guest QR codes from an Excel/CSV sheet with columns like
 * "CODE NO" and "NAME" (and optionally a phone column). Each row gets a
 * unique 8-character hash that is embedded in the printable QR image.
 */
class QrImportService
{
    /** @return array{imported: int, skipped: int, errors: string[]} */
    public function import(string $path, Event $event, User $uploader): array
    {
        $sheet = IOFactory::load($path)->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);

        if (count($rows) < 2) {
            return ['imported' => 0, 'skipped' => 0, 'errors' => ['File must contain a header row and at least one data row.']];
        }

        $headers = array_map(fn ($h) => strtolower(trim((string) $h)), $rows[0]);
        $codeIdx = $this->findColumn($headers, ['code', 'no']);
        $nameIdx = $this->findColumn($headers, ['name']);
        $phoneIdx = $this->findColumn($headers, ['phone', 'mobile', 'tel']);

        if ($codeIdx === null || $nameIdx === null) {
            return ['imported' => 0, 'skipped' => 0, 'errors' => ['Sheet must have "CODE NO" and "NAME" columns.']];
        }

        $imported = 0;
        $skipped = 0;
        $errors = [];

        foreach (array_slice($rows, 1) as $i => $row) {
            $code = strtoupper(trim((string) ($row[$codeIdx] ?? '')));
            $name = trim((string) ($row[$nameIdx] ?? ''));

            if ($code === '' || $name === '') {
                $skipped++;
                continue;
            }

            if ($event->qrCodes()->where('code', $code)->exists()) {
                $skipped++;
                $errors[] = 'Row ' . ($i + 2) . ": code {$code} already exists — skipped.";
                continue;
            }

            $parsed = QrCode::parseCode($code);

            QrCode::create([
                'event_id' => $event->id,
                'code' => $code,
                'guest_name' => $name,
                'phone_number' => $phoneIdx !== null ? (trim((string) ($row[$phoneIdx] ?? '')) ?: null) : null,
                'type' => $parsed['type'],
                'max_admissions' => $parsed['max'],
                'qr_hash' => $this->uniqueHash(),
                'uploaded_by' => $uploader->id,
            ]);

            $imported++;
        }

        return ['imported' => $imported, 'skipped' => $skipped, 'errors' => $errors];
    }

    private function findColumn(array $headers, array $needles): ?int
    {
        foreach ($headers as $idx => $header) {
            foreach ($needles as $needle) {
                if (str_contains($header, $needle)) {
                    return $idx;
                }
            }
        }
        return null;
    }

    private function uniqueHash(): string
    {
        do {
            $hash = strtoupper(Str::random(8));
        } while (QrCode::where('qr_hash', $hash)->exists());

        return $hash;
    }
}
