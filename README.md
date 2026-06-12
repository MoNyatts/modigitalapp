# Mo' Digital Events

Real-time event admission management with QR scanning, built with **React Native** (bare workflow — no Expo) and a **Node.js (Hono + tRPC + SQLite)** backend.

## What's inside

| Area | Tech |
|------|------|
| Mobile app | React Native 0.81, React Navigation 7, TanStack Query, tRPC client |
| QR scanning | react-native-vision-camera (ML Kit code scanner) |
| File import/export | @react-native-documents/picker, @dr.pogodin/react-native-fs, react-native-share, xlsx, jszip |
| Backend | Hono + tRPC server on Node.js, better-sqlite3 database |

## Project layout

```
App.tsx               App entry — providers + navigation container
navigation/           React Navigation stacks, tabs, and the path router
screens/              All app screens (events, scanner, reports, QR codes, users, …)
hooks/                useAuth / useEvents context hooks
lib/                  tRPC client, config, storage, camera/file/picker adapters
constants/            Color palette
types/                Shared TypeScript types
backend/              Node.js backend server (deploy separately)
android/ ios/         Native projects
```

## Quick start (development)

```bash
npm install

# Terminal 1 — backend server
npm run dev:backend

# Terminal 2 — Metro bundler
npm start

# Terminal 3 — run the app
npm run android   # or: npm run ios  (macOS only; run `cd ios && pod install` first)
```

Point the app at your backend by editing `SERVER_URL` in [lib/config.ts](lib/config.ts):

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical device: `http://<your-computer-LAN-IP>:3000`

## Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for the full production guide: backend hosting, Android (Google Play) and iOS (App Store) builds, signing, and store submission.

## Default admin credentials

| Email | Password | Role |
|-------|----------|------|
| admin@modigitalevents.com | Admin@123 | Admin |

Change this password immediately after first login.
