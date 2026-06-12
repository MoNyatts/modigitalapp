# Mo' Digital Events — Production Deployment Guide

**Stack:** React Native (bare workflow) mobile app + Node.js backend (Hono + tRPC + SQLite).
This guide covers everything from a clean machine to live apps in the **Google Play Store** and **Apple App Store**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORKED ARCHITECTURE                        │
│                                                                  │
│   📱 Scanner Device A ──┐                                       │
│   📱 Scanner Device B ──┼──► 🌐 Backend Server (Railway/VPS)   │
│   📱 Admin Device     ──┘         │                             │
│                                   ▼                             │
│                          🗄️  SQLite Database                    │
│                       (Single source of truth)                  │
│                                                                  │
│  • Scanner A admits a guest → server records it instantly       │
│  • Scanner B scans same QR → server rejects: "Already used"     │
│  • Both scanners see same real-time feed (5-second polling)     │
└─────────────────────────────────────────────────────────────────┘
```

All scan operations run inside a SQLite transaction on the server, so two
scanners can never double-admit the same guest.

### QR Code Admission Rules

| Code Prefix | Type     | Max Admissions | Example             |
|-------------|----------|----------------|---------------------|
| `S`         | Single   | 1 person       | `S001 - John Doe`   |
| `D`         | Double   | 2 people       | `D001 - Jane Doe`   |
| `M5`        | Multiple | 5 people       | `M5001 - Corp XYZ`  |
| `M10`       | Multiple | 10 people      | `M10002 - VIP Group`|

---

## PART 0 — Prerequisites

### All platforms
- **Node.js 20+** and npm
- The project folder (`MoDigitalEventsApp`) with `npm install` completed

### Android builds
- **JDK 17** (Temurin recommended: https://adoptium.net)
- **Android Studio** with Android SDK Platform 36 and Build-Tools
- `ANDROID_HOME` environment variable pointing at the SDK
- A **Google Play Console** account ($25 one-time fee): https://play.google.com/console

### iOS builds
- A **Mac** with **Xcode 16+** (iOS apps can only be built and submitted from macOS)
- **CocoaPods**: `sudo gem install cocoapods`
- An **Apple Developer Program** membership ($99/year): https://developer.apple.com

---

## PART 1 — Deploy the Backend Server

The backend lives in the `backend/` folder of this project and runs anywhere
Node.js runs. The mobile app is useless without it — deploy this first.

### Option A: Railway (easiest)

1. Create an account at https://railway.app
2. Install the CLI and deploy:
   ```bash
   npm install -g @railway/cli
   railway login
   cd MoDigitalEventsApp
   railway init
   railway up
   ```
3. **Add a Volume** (critical — the SQLite file must survive restarts):
   - Railway Dashboard → your service → **Volumes** → **New Volume**
   - Mount path: `/app/data`, size: 1 GB
4. **Set environment variables** (Dashboard → Variables):
   ```
   NODE_ENV=production
   PORT=3000
   DB_PATH=/app/data/modigitalevents.db
   ```
5. **Test it:** open `https://<your-app>.railway.app/api/health`
   → should return `{"status":"ok","backend":"hono","trpc":"enabled"}` ✅
6. Copy the URL — you need it in Part 2.

### Option B: Render

1. Create account at https://render.com → New → Web Service → connect your repo
2. Build command: `npm install && npm run build:backend`
3. Start command: `node dist/backend/index.js`
4. Add a **Disk**: mount path `/app/data`, 1 GB
5. Set the same environment variables as above

### Option C: VPS (DigitalOcean / AWS / Hetzner)

```bash
# SSH into the server, then:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx

git clone https://github.com/YOUR_USERNAME/mo-digital-events.git
cd mo-digital-events
npm install && npm run build:backend

sudo mkdir -p /app/data
sudo npm install -g pm2
DB_PATH=/app/data/modigitalevents.db PORT=3000 pm2 start dist/backend/index.js --name mo-digital-events
pm2 save && pm2 startup

# HTTPS (required for production mobile apps):
sudo certbot --nginx -d your-domain.com
```

> **HTTPS is mandatory for production.** Release builds of the app block
> cleartext `http://` traffic on both Android and iOS. Railway and Render
> provide HTTPS automatically; on a VPS use the Certbot step above.

---

## PART 2 — Point the Mobile App at Your Server

Open [`lib/config.ts`](lib/config.ts) and set the production URL:

```ts
export const SERVER_URL = 'https://YOUR-ACTUAL-URL.railway.app';
```

That is the **only** place the app reads the backend address.

**Test the connection before building:**

```bash
npm start            # Metro bundler
npm run android      # or: npm run ios
```

Log in with the default credentials:
- Email: `admin@modigitalevents.com`
- Password: `Admin@123`

If login succeeds, the app is talking to your server ✅

---

## PART 3 — Android: Build & Publish to Google Play

### Step 1 — Generate a release signing key (one time)

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore modigitalevents-release.keystore -alias modigitalevents -keyalg RSA -keysize 2048 -validity 10000
```

Answer the prompts and choose a strong store password.
**Back this file and its passwords up somewhere safe** — if you lose the
keystore you can never update the app again.

### Step 2 — Configure Gradle signing

Add to `android/gradle.properties` (do **not** commit real passwords to a
public repo — use a local `~/.gradle/gradle.properties` instead):

```properties
MODIGITAL_UPLOAD_STORE_FILE=modigitalevents-release.keystore
MODIGITAL_UPLOAD_KEY_ALIAS=modigitalevents
MODIGITAL_UPLOAD_STORE_PASSWORD=*****
MODIGITAL_UPLOAD_KEY_PASSWORD=*****
```

In `android/app/build.gradle`, inside the `android { ... }` block, replace the
debug-only signing config with:

```groovy
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file(MODIGITAL_UPLOAD_STORE_FILE)
        storePassword MODIGITAL_UPLOAD_STORE_PASSWORD
        keyAlias MODIGITAL_UPLOAD_KEY_ALIAS
        keyPassword MODIGITAL_UPLOAD_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled enableProguardInReleaseBuilds
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

### Step 3 — Build

```bash
cd android

# Test APK — install directly on any Android device:
gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk

# Play Store bundle (AAB) — what you upload to Google Play:
gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

Install the APK on a real phone and verify login + QR scanning against your
production server before submitting.

### Step 4 — Google Play Console

1. https://play.google.com/console → **Create app** → "Mo' Digital Events"
2. **Store listing:**
   - Short description: *"Real-time event admission management with QR scanning"*
   - At least 2 phone screenshots, 512×512 app icon, feature graphic
   - Privacy policy URL (required — the app handles user accounts)
3. **App content:** complete the content-rating questionnaire, data-safety
   form (the app collects names/emails for event staff accounts), and target
   audience declarations
4. **Camera permission:** the app declares `CAMERA` for QR scanning — explain
   this in the data-safety / permissions declarations
5. **Release:** Production → Create new release → upload `app-release.aab`
6. Submit for review (typically 1–3 business days)

### Step 5 — Updating the app later

Bump `versionCode` (integer, must always increase) and `versionName` in
`android/app/build.gradle`, rebuild the AAB, upload a new release.

---

## PART 4 — iOS: Build & Publish to the App Store

> All steps in this part require a Mac with Xcode.

### Step 1 — Install pods

```bash
cd ios
pod install
cd ..
```

### Step 2 — Open and configure the project

```bash
open ios/MoDigitalEvents.xcworkspace   # ALWAYS the .xcworkspace, never .xcodeproj
```

In Xcode, select the **MoDigitalEvents** target:
- **Signing & Capabilities:** check *Automatically manage signing* and select
  your Apple Developer team. Bundle identifier is already set to
  `com.modigitalevents.app`.
- **General:** set *Version* (e.g. `1.0.0`) and *Build* (e.g. `1`).

### Step 3 — Register the app in App Store Connect

1. https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**
   - Platform: iOS
   - Name: *Mo' Digital Events*
   - Bundle ID: `com.modigitalevents.app`
   - SKU: `modigitalevents`
2. Fill in metadata: category (Business), description, keywords,
   screenshots (6.7" iPhone required), privacy policy URL
3. **App Privacy:** declare collection of name/email (account management).
   Camera usage is already explained by the purpose string in `Info.plist`.

### Step 4 — Archive and upload

In Xcode:
1. Select destination **Any iOS Device (arm64)**
2. **Product → Archive**
3. When the Organizer opens: **Distribute App → App Store Connect → Upload**

Or from the command line:

```bash
xcodebuild -workspace ios/MoDigitalEvents.xcworkspace \
  -scheme MoDigitalEvents -configuration Release \
  -archivePath build/MoDigitalEvents.xcarchive archive

xcodebuild -exportArchive \
  -archivePath build/MoDigitalEvents.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ios/ExportOptions.plist
```

### Step 5 — TestFlight, then submit

1. The uploaded build appears in App Store Connect → **TestFlight** after
   processing (~15 min). Test on real devices — especially camera scanning.
2. When satisfied: **App Store** tab → select the build → **Submit for Review**
3. Review typically takes 1–7 business days.

### Step 6 — Updating the app later

Bump *Version*/*Build* in Xcode (Build must always increase), re-archive,
re-upload.

---

## PART 5 — Multi-Device Scanner Setup

Every scanner device polls the server every 5 seconds, and each scan is an
atomic SQLite transaction on the server.

| Timeline   | What happens                                          |
|------------|-------------------------------------------------------|
| 2:00:00 PM | Scanner A scans `S001 - John Doe` → Admitted ✅       |
| 2:00:00 PM | Scanner B scans `S001 - John Doe` → Server rejects ❌ |
| 2:00:05 PM | Scanner B's feed refreshes → shows "Already used"     |

### Setting up scanners

1. **Admin logs in** with `admin@modigitalevents.com` / `Admin@123`
   ⚠️ **Change this password immediately** (Users tab → edit your profile)
2. **Create scanner accounts** (Users → Add User):
   - Role: **Guest**, Scanner Mode: ✅ enabled, assign their events
3. Each scanner person installs the app from the store and logs in
4. All scanners select the same **Event + Activity** before scanning

### Verify multi-device sync

1. Log in on two devices (different accounts, same event)
2. Device A scans a QR code → ✅ Admitted
3. Device B scans the **same** code → ❌ "Already used"
4. If step 3 rejects, sync is working 🎉

---

## PART 6 — Security Checklist

- [ ] Default admin password changed from `Admin@123`
- [ ] Backend is HTTPS (automatic on Railway/Render; Certbot on VPS)
- [ ] `DB_PATH` set via environment variable, volume/disk mounted
- [ ] `SERVER_URL` in `lib/config.ts` points at the HTTPS production URL
- [ ] Android release keystore + passwords backed up offline
- [ ] Scanner users only assigned to the events they need
- [ ] Database backups configured (Part 7)

---

## PART 7 — Database Backup

### Manual (SSH)
```bash
sqlite3 /app/data/modigitalevents.db ".backup /tmp/backup_$(date +%Y%m%d_%H%M%S).db"
scp root@your-server:/tmp/backup_*.db ./backups/
```

### Automated daily (cron, keeps 30 days)
```bash
crontab -e
0 2 * * * sqlite3 /app/data/modigitalevents.db ".backup /backups/modigital_$(date +\%Y\%m\%d).db" && find /backups -name "*.db" -mtime +30 -delete
```

Railway Pro also offers automatic volume backups (Dashboard → Backups).

---

## PART 8 — Quick Reference Commands

```bash
# ── Local development ──────────────────────────────────────────
npm run dev:backend          # Start backend server (port 3000)
npm start                    # Start Metro bundler
npm run android              # Build & run on Android device/emulator
npm run ios                  # Build & run on iOS simulator (macOS)

# ── Verification ───────────────────────────────────────────────
npm run typecheck            # TypeScript check
npm test                     # Unit tests
npm run lint                 # ESLint

# ── Android release ────────────────────────────────────────────
cd android && gradlew assembleRelease    # APK for direct install/testing
cd android && gradlew bundleRelease      # AAB for Google Play

# ── iOS release (macOS) ────────────────────────────────────────
cd ios && pod install                    # After any native dep change
open ios/MoDigitalEvents.xcworkspace     # Then Product → Archive

# ── Backend (Railway) ──────────────────────────────────────────
railway up                   # Deploy
railway logs                 # View logs
```

---

## PART 9 — Troubleshooting

**Login fails / "Cannot connect to server"**
1. Check backend health: `curl https://your-backend.example.com/api/health`
2. Verify `SERVER_URL` in `lib/config.ts` and rebuild the app
3. Release builds require **https://** — cleartext http is blocked

**Camera shows a black screen / scanner does not start**
- Camera permission was denied — enable it in system Settings → Apps
- Android: confirm `VisionCamera_enableCodeScanner=true` is present in
  `android/gradle.properties` (it ships enabled in this project)
- Camera does not work on emulators/simulators — test on a real device

**"QR code not found" for valid codes**
- The admin must upload the QR-code Excel sheet to the event first
- Scanner must have the correct **Event AND Activity** selected

**Scanners not seeing each other's scans**
- Both devices need internet and must be on the same event + activity
- Confirm the backend is reachable from the cellular network, not just Wi-Fi

**Android build fails with SDK/JDK errors**
- Use JDK 17 (`java -version`), set `ANDROID_HOME`, accept SDK licenses:
  `sdkmanager --licenses`

**iOS build fails after adding/updating dependencies**
- Re-run `cd ios && pod install`; always open the `.xcworkspace`

**App crashes on launch in release**
- Check the backend health endpoint first
- Android: `adb logcat | grep -i modigital` while launching
- iOS: Xcode → Window → Devices and Simulators → device logs

---

## Default Admin Credentials

| Email                     | Password  | Role  |
|---------------------------|-----------|-------|
| admin@modigitalevents.com | Admin@123 | Admin |

⚠️ **Change the password immediately after first login.**
New scanner accounts are created by the admin in the **Users** tab.
