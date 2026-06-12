/**
 * Backend server configuration.
 *
 * SERVER_URL is the single place the mobile app learns where its backend
 * lives. Update it before building for a device or for the app stores.
 *
 *   Local development (Android emulator):  http://10.0.2.2:3000
 *   Local development (iOS simulator):     http://localhost:3000
 *   Physical device on the same Wi-Fi:     http://192.168.X.X:3000
 *   Production:                            https://your-backend.example.com
 *
 * Note: cleartext (http://) URLs only work in debug builds. Release builds
 * on both platforms require https:// unless you explicitly opt out in the
 * native configuration — use a proper HTTPS URL for production.
 */
export const SERVER_URL = 'http://localhost:3000';
