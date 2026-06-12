import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const scanProcedure = publicProcedure
  .input(z.object({
    qrCodeData: z.string(),          // The raw scanned QR string e.g. "S001 - John Doe"
    eventId: z.string(),
    activityId: z.string(),
    scannedBy: z.string(),
    admissionCount: z.number().min(1).default(1),
    notes: z.string().optional(),
  }))
  .mutation(({ input }) => {
    // ATOMIC TRANSACTION — SQLite transaction guarantees no double-admit race condition
    const doScan = db.transaction(() => {
      const { qrCodeData, eventId, activityId, scannedBy, admissionCount, notes } = input;

      // Parse raw QR code string: "S001 - John Doe" or just "S001"
      const trimmed = qrCodeData.trim();
      const dashIdx = trimmed.indexOf(' - ');
      const codeNo = dashIdx !== -1 ? trimmed.substring(0, dashIdx).trim() : trimmed;
      const guestNameFromQr = dashIdx !== -1 ? trimmed.substring(dashIdx + 3).trim() : null;

      // Determine type and max admissions from code prefix
      const firstChar = codeNo.charAt(0).toUpperCase();
      let type: string;
      let maxAdmissions: number;
      if (firstChar === 'S') { type = 'S'; maxAdmissions = 1; }
      else if (firstChar === 'D') { type = 'D'; maxAdmissions = 2; }
      else if (firstChar === 'M') {
        const num = parseInt(codeNo.slice(1));
        type = 'M';
        maxAdmissions = isNaN(num) ? 1 : num;
      } else {
        // Unknown format — try to find by hash
        const byHash = db.prepare(
          'SELECT * FROM qr_codes WHERE qr_hash = ? AND event_id = ? AND is_valid = 1'
        ).get(trimmed, eventId) as any;
        if (!byHash) {
          const rejId = `rej-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          db.prepare(`INSERT INTO rejected_scans (id, qr_code, event_id, activity_id, scanned_by, attempted_admission_count, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(rejId, qrCodeData, eventId, activityId, scannedBy, admissionCount, 'INVALID_CODE');
          return { success: false, reason: 'INVALID_CODE', message: 'QR code not recognized', guestName: null, totalUsed: 0, maxAdmissions: 0, remaining: 0 };
        }
        type = byHash.type;
        maxAdmissions = byHash.max_admissions;
      }

      // Find the QR code record — match by code number OR hash for this event
      let qrRow = db.prepare(
        'SELECT * FROM qr_codes WHERE (code = ? OR qr_hash = ?) AND event_id = ? AND is_valid = 1'
      ).get(codeNo, trimmed, eventId) as any;

      if (!qrRow) {
        // Code not in our upload — auto-register it from the scanned data
        const newId = `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(`
          INSERT INTO qr_codes (id, code, type, event_id, max_admissions, guest_name, is_valid)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(newId, codeNo, type, eventId, maxAdmissions, guestNameFromQr || `Guest ${codeNo}`);
        qrRow = db.prepare('SELECT * FROM qr_codes WHERE id = ?').get(newId) as any;
      }

      // COUNT total admissions already used for this QR code in this specific activity
      const usedResult = db.prepare(
        'SELECT COALESCE(SUM(admission_count), 0) as total FROM scans WHERE qr_code_id = ? AND activity_id = ?'
      ).get(qrRow.id, activityId) as { total: number };
      const totalUsed = Number(usedResult.total);
      const remaining = qrRow.max_admissions - totalUsed;

      // CHECK: Is there enough remaining capacity?
      if (remaining <= 0) {
        const rejId = `rej-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        db.prepare(`INSERT INTO rejected_scans (id, qr_code_id, qr_code, event_id, activity_id, scanned_by, attempted_admission_count, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(rejId, qrRow.id, qrCodeData, eventId, activityId, scannedBy, admissionCount, 'FULLY_USED');
        return {
          success: false,
          reason: 'FULLY_USED',
          message: `QR code fully used. All ${qrRow.max_admissions} admission(s) have been used.`,
          guestName: qrRow.guest_name,
          totalUsed,
          maxAdmissions: qrRow.max_admissions,
          remaining: 0,
          qrCodeId: qrRow.id,
        };
      }

      // Partial use case: if admissionCount > remaining, only admit what remains
      const actualAdmissions = Math.min(admissionCount, remaining);

      // RECORD THE SCAN — this is the moment of admission
      const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const scannedAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO scans (id, qr_code_id, qr_code, event_id, activity_id, scanned_by, scanned_at, admission_count, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(scanId, qrRow.id, qrCodeData, eventId, activityId, scannedBy, scannedAt, actualAdmissions, notes || null);

      const newTotal = totalUsed + actualAdmissions;
      const newRemaining = qrRow.max_admissions - newTotal;

      return {
        success: true,
        scanId,
        qrCodeId: qrRow.id,
        guestName: qrRow.guest_name || guestNameFromQr || `Guest ${codeNo}`,
        admissionCount: actualAdmissions,
        totalUsed: newTotal,
        maxAdmissions: qrRow.max_admissions,
        remaining: newRemaining,
        scannedAt,
        message: actualAdmissions < admissionCount
          ? `Partial admit: ${actualAdmissions} person(s) admitted (only ${remaining} remaining). Total: ${newTotal}/${qrRow.max_admissions}`
          : `Admitted ${actualAdmissions} person(s). Total: ${newTotal}/${qrRow.max_admissions}`,
        isPartial: actualAdmissions < admissionCount,
        reason: 'SUCCESS',
      };
    });

    return doScan();
  });
