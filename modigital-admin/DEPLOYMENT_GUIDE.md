# Mo' Digital Events — Production Deployment Guide (Laravel + Flutter + PostgreSQL)

The platform has two deployable pieces:

```
📱 Flutter scanner app  ──►  🌐 Laravel (this repo)  ──►  🐘 PostgreSQL
   gate staff devices         /api (Sanctum tokens)        managed or self-hosted
                              /     admin web panel
```

Deploy the Laravel app first — the mobile app is useless without it.

---

## PART 1 — Deploy Laravel + PostgreSQL

### Option A: VPS (DigitalOcean / Hetzner / AWS) — full control

```bash
# Ubuntu 24.04, as root:
apt update && apt install -y nginx postgresql php8.4-fpm php8.4-cli \
  php8.4-pgsql php8.4-mbstring php8.4-xml php8.4-curl php8.4-zip php8.4-gd \
  php8.4-intl composer git certbot python3-certbot-nginx

# Database
sudo -u postgres psql -c "CREATE ROLE modigital LOGIN PASSWORD 'STRONG-PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE modigital OWNER modigital;"

# App
git clone https://github.com/MoNyatts/modigital-admin.git /var/www/modigital
cd /var/www/modigital
composer install --no-dev --optimize-autoloader
cp .env.example .env && php artisan key:generate
# edit .env: APP_ENV=production, APP_DEBUG=false, APP_URL, DB_* (port 5432)
php artisan migrate --seed --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache

# Nginx vhost (root must be /var/www/modigital/public), then:
certbot --nginx -d admin.yourdomain.com
```

### Option B: Managed PaaS

- **Laravel Forge / Ploi** — point at this repo, provision a server, done (recommended if you want zero ops)
- **Railway / Render** — both support PHP + managed PostgreSQL; set the `.env` values
  as environment variables and run `php artisan migrate --force` as a deploy step

### Verify

- `https://admin.yourdomain.com/api/health` → `{"status":"ok","backend":"laravel"}`
- Log in at `https://admin.yourdomain.com/login` with `admin@modigitalevents.com` / `Admin@123`
- **Change the default password immediately** (Users → edit Administrator)

---

## PART 2 — Admin Panel Workflow

1. **Create an event** (Events → New Event), add **activities** (e.g. "Main Entrance", per-day sessions)
2. **Upload the guest sheet** (Event → QR Codes → upload .xlsx/.csv with `CODE NO` + `NAME` columns)
3. **Download the QR PNGs** as a ZIP and send them to guests / print them
4. **Create staff accounts** (Users → New User, role *Staff*, scanner enabled) and **assign their events**
5. During the event, watch the **dashboard** and per-event **reports** update live
6. Afterwards, **export the XLSX report** per event

---

## PART 3 — Build & Ship the Flutter App

Repo: https://github.com/MoNyatts/modigital-flutter

### Configure

Point the app at production in `lib/config.dart`:

```dart
const String apiBase = 'https://admin.yourdomain.com/api';
```

### Android (Google Play)

```bash
# One-time: create a signing keystore
keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000

# android/key.properties (do not commit):
#   storeFile=../upload-keystore.jks
#   storePassword=*****
#   keyAlias=upload
#   keyPassword=*****

flutter build appbundle --release
# → build/app/outputs/bundle/release/app-release.aab → upload in Play Console
```

Play Console: create the app, store listing (screenshots, 512×512 icon, privacy
policy URL), content rating, data-safety form (collects staff name/email), upload
the AAB to a production release, submit for review (1–3 days).

### iOS (App Store — requires a Mac)

```bash
flutter build ipa --release
```

Open `build/ios/archive/*.xcarchive` in Xcode → Distribute App → App Store
Connect. Register the bundle ID, fill App Store Connect metadata, TestFlight,
submit for review. Camera permission text is already set in `Info.plist`.

---

## PART 4 — Multi-Device Scanning

Every admission runs inside a PostgreSQL transaction with `SELECT … FOR UPDATE`
on the QR code row:

| Time | Device A | Device B |
|------|----------|----------|
| 14:00:00.000 | scans `S001` → **Admitted** ✅ | scans `S001` → waits on row lock… |
| 14:00:00.050 | | → **Rejected: already used** ❌ |

Each scanner also polls `/api/activities/{id}/feed` every 5 seconds, so all
devices see the same live admission list.

---

## PART 5 — Security & Operations Checklist

- [ ] Default admin password changed
- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] HTTPS active (the app refuses cleartext HTTP in release builds)
- [ ] PostgreSQL not exposed publicly (localhost or private network only)
- [ ] Staff accounts assigned only to the events they work
- [ ] Database backups: `pg_dump modigital > backup.sql` daily via cron, or
      your provider's managed backups
- [ ] Android keystore + passwords backed up offline

---

## Troubleshooting

**App says "Could not load events" / login fails**
- Check `https://…/api/health` from the phone's browser
- Confirm `apiBase` in `lib/config.dart` and rebuild
- Release builds require HTTPS

**"QR code not found for this event"**
- The guest sheet must be uploaded to that event first
- Scanner must select the right event + activity

**Two scanners both admitted the same code**
- Not possible through this backend — if observed, both scans will show in the
  event report with timestamps; check that both devices point at the same server

**500 errors after deploy**
- `php artisan config:clear` then re-cache; check `storage/logs/laravel.log`
- Ensure `storage/` and `bootstrap/cache/` are writable by the web server
