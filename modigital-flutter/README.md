# Mo' Digital Events — Scanner App (Flutter)

Gate-staff mobile app for the Mo' Digital Events platform. Pairs with the
[Laravel admin panel + API](https://github.com/MoNyatts/modigital-admin).

## What it does

- **Sign in** with a staff account created in the admin panel (Sanctum token, persisted)
- **Pick an event + activity** (only events assigned to you)
- **Scan QR codes** with the camera (ML Kit) or enter codes manually with a guest count
- **Instant admit/reject feedback** — admissions are decided atomically on the server,
  so two scanners can never double-admit the same code
- **Live feed** — every device polls the server every 5 seconds and sees all admissions

## Configure

Set the API base URL in [lib/config.dart](lib/config.dart):

```dart
// Android emulator:             http://10.0.2.2:8000/api
// iOS simulator:                http://localhost:8000/api
// Physical device (same Wi-Fi): http://192.168.X.X:8000/api
// Production:                   https://admin.yourdomain.com/api
const String apiBase = 'http://10.0.2.2:8000/api';
```

## Run (development)

```bash
flutter pub get
flutter run        # with an emulator running or device connected
```

The backend must be running — see the admin repo (`php artisan serve`).

## Build for release

```bash
# Android (Play Store bundle / direct-install APK)
flutter build appbundle --release
flutter build apk --release

# iOS (requires macOS + Xcode; then archive in Xcode)
flutter build ipa --release
```

Before a release build, point `apiBase` at your production HTTPS URL —
cleartext HTTP is blocked in release builds on both platforms.

### Android signing

Create a keystore and a `android/key.properties` file per the
[Flutter docs](https://docs.flutter.dev/deployment/android#signing-the-app),
then `flutter build appbundle` produces a Play-ready `.aab`.
