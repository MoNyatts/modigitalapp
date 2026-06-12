import { createTRPCRouter } from './create-context';

// Example
import hiProcedure from './routes/example/hi/route';

// Events
import { listEventsProcedure } from './routes/events/list';
import { createEventProcedure } from './routes/events/create';
import { updateEventProcedure } from './routes/events/update';
import { deleteEventProcedure } from './routes/events/delete';

// QR Codes
import { bulkUploadProcedure } from './routes/qr/bulk-upload';
import { validateProcedure } from './routes/qr/validate';
import { invalidateProcedure } from './routes/qr/invalidate';
import { listQRCodesProcedure, listProcedure } from './routes/qr/list';
import { downloadQRCodesProcedure } from './routes/qr/download-qr-codes';

// Scanner — networked, atomic (multi-device safe)
import { scanProcedure } from './routes/scanner/scan';
import { checkQRStatusProcedure } from './routes/scanner/check';
import { scanHistoryProcedure } from './routes/scanner/history';
import { scanReportProcedure } from './routes/scanner/report';

// Users
import { listUsersProcedure } from './routes/users/list';
import { createUserProcedure } from './routes/users/create';
import { updateUserProcedure } from './routes/users/update';
import { deleteUserProcedure } from './routes/users/delete';
import { authenticateProcedure } from './routes/users/authenticate';

// Messaging
import { sendSmsProcedure } from './routes/messaging/send-sms';
import { sendWhatsappProcedure } from './routes/messaging/send-whatsapp';

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiProcedure,
  }),

  // ─── Events ─────────────────────────────────────────────────
  events: createTRPCRouter({
    list: listEventsProcedure,
    create: createEventProcedure,
    update: updateEventProcedure,
    delete: deleteEventProcedure,
  }),

  // ─── QR Codes ────────────────────────────────────────────────
  qr: createTRPCRouter({
    bulkUpload: bulkUploadProcedure,
    validate: validateProcedure,
    invalidate: invalidateProcedure,
    list: listQRCodesProcedure,
    downloadQRCodes: downloadQRCodesProcedure,
  }),

  // ─── Scanner (real-time, multi-device) ───────────────────────
  scanner: createTRPCRouter({
    scan: scanProcedure,           // Atomic admission (safe for concurrent scanners)
    checkStatus: checkQRStatusProcedure,   // Check QR code status across all devices
    history: scanHistoryProcedure, // Live scan feed (polled every 5s on scanner screen)
    report: scanReportProcedure,   // Statistics per event/activity
  }),

  // ─── Users ───────────────────────────────────────────────────
  users: createTRPCRouter({
    list: listUsersProcedure,
    create: createUserProcedure,
    update: updateUserProcedure,
    delete: deleteUserProcedure,
    authenticate: authenticateProcedure,
  }),

  // ─── Messaging ───────────────────────────────────────────────
  messaging: createTRPCRouter({
    sendSms: sendSmsProcedure,
    sendWhatsapp: sendWhatsappProcedure,
  }),
});

export type AppRouter = typeof appRouter;
