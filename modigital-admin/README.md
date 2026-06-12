# Mo' Digital Events — Admin Panel & API

Full-stack **Laravel** application for the Mo' Digital Events platform:

- **Admin web panel** — dashboard, events & activities, QR code uploads, users, attendance reports
- **REST API** — consumed by the [Flutter scanner app](https://github.com/MoNyatts/modigital-flutter) (Sanctum token auth)
- **PostgreSQL** — single source of truth; admissions are recorded atomically with row locking, so two scanners can never double-admit the same code

## Stack

| Layer | Tech |
|-------|------|
| Framework | Laravel 13 (PHP 8.4) |
| Database | PostgreSQL 17 |
| API auth | Laravel Sanctum (bearer tokens) |
| Excel import/export | PhpSpreadsheet |
| QR generation | chillerlan/php-qrcode |
| Admin UI | Blade + Bootstrap 5 |

## Quick start

```bash
composer install
cp .env.example .env
php artisan key:generate

# Configure PostgreSQL in .env:
#   DB_CONNECTION=pgsql
#   DB_HOST=127.0.0.1
#   DB_PORT=5432
#   DB_DATABASE=modigital
#   DB_USERNAME=modigital
#   DB_PASSWORD=********

php artisan migrate --seed     # creates the admin account
php artisan serve              # http://localhost:8000
```

**Default admin:** `admin@modigitalevents.com` / `Admin@123` — change it immediately after first login.

## REST API (for the scanner app)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Email + password → bearer token |
| POST | `/api/logout` | Revoke current token |
| GET | `/api/events` | Events (with activities) the user may scan for |
| POST | `/api/scan` | Atomic admission: `{qr_data, activity_id, admission_count?}` |
| GET | `/api/scan/status` | Live status of a code without admitting |
| GET | `/api/activities/{id}/feed` | Recent admissions/rejections + totals (poll ~5 s) |
| GET | `/api/health` | Health check |

### QR code types

| Code prefix | Type | Max admissions |
|-------------|------|----------------|
| `S…` | Single | 1 |
| `D…` | Double | 2 |
| `M5…` / `M10…` | Group | 5 / 10 |

Guest sheets (.xlsx/.csv) need `CODE NO` and `NAME` columns; each row gets a unique
8-character hash embedded in its printable QR PNG (downloadable as a ZIP per event).

## Atomic scanning

`App\Services\ScanService` performs the admission decision inside a database
transaction with `SELECT … FOR UPDATE` on the QR code row. Concurrent scans of
the same code are serialized by PostgreSQL — the second device sees the first
device's admission and rejects. This is the property the whole product hangs on.

## Deployment notes

- Any PHP host works (Laravel Forge, Ploi, a VPS with nginx + php-fpm, Railway, Render…)
- Set `APP_ENV=production`, `APP_DEBUG=false`, a real `APP_URL`, and PostgreSQL credentials
- `php artisan migrate --force` on deploy
- HTTPS is required — the mobile app blocks cleartext HTTP in release builds
