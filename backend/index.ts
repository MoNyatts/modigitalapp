/**
 * Mo' Digital Events — Backend Server Entry Point
 *
 * Starts the Hono + tRPC server with a SQLite database.
 * All scanner devices connect to this server for real-time,
 * multi-device-safe QR code admission management.
 *
 * Start:
 *   npx tsx backend/index.ts          (development)
 *   node dist/backend/index.js        (production)
 *
 * Environment variables:
 *   PORT       — port to listen on (default: 3000)
 *   DB_PATH    — path to SQLite database file (default: ./data/modigitalevents.db)
 *   NODE_ENV   — "production" | "development"
 */

import { serve } from '@hono/node-server';
import app from './hono';

const PORT = parseInt(process.env.PORT || '3000', 10);

console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║      Mo Digital Events — Backend Server          ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`✅ Server running at http://localhost:${info.port}`);
    console.log(`   Health check:  http://localhost:${info.port}/api/health`);
    console.log(`   tRPC endpoint: http://localhost:${info.port}/api/trpc`);
    console.log('');
    console.log(`   DB path: ${process.env.DB_PATH || './data/modigitalevents.db'}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('   All scanner devices should connect to this server.');
    console.log('   Set SERVER_URL in lib/config.ts of the mobile app to this server URL.');
    console.log('');
  }
);
