import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const scanHistoryProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
    activityId: z.string(),
    limit: z.number().optional().default(100),
    sinceTimestamp: z.string().optional(),
  }))
  .query(({ input }) => {
    let scans: any[];
    if (input.sinceTimestamp) {
      scans = db.prepare(`
        SELECT s.*, q.guest_name, q.type, q.max_admissions
        FROM scans s
        LEFT JOIN qr_codes q ON q.id = s.qr_code_id
        WHERE s.event_id = ? AND s.activity_id = ? AND s.scanned_at > ?
        ORDER BY s.scanned_at DESC LIMIT ?
      `).all(input.eventId, input.activityId, input.sinceTimestamp, input.limit) as any[];
    } else {
      scans = db.prepare(`
        SELECT s.*, q.guest_name, q.type, q.max_admissions
        FROM scans s
        LEFT JOIN qr_codes q ON q.id = s.qr_code_id
        WHERE s.event_id = ? AND s.activity_id = ?
        ORDER BY s.scanned_at DESC LIMIT ?
      `).all(input.eventId, input.activityId, input.limit) as any[];
    }

    const rejectedScans = db.prepare(`
      SELECT * FROM rejected_scans
      WHERE event_id = ? AND activity_id = ?
      ORDER BY scanned_at DESC LIMIT ?
    `).all(input.eventId, input.activityId, input.limit) as any[];

    return {
      scans: scans.map(r => ({
        id: r.id,
        qrCodeId: r.qr_code_id,
        qrCode: r.qr_code,
        eventId: r.event_id,
        activityId: r.activity_id,
        scannedBy: r.scanned_by,
        scannedAt: r.scanned_at,
        admissionCount: r.admission_count,
        notes: r.notes,
        guestName: r.guest_name,
        type: r.type,
        maxAdmissions: r.max_admissions,
      })),
      rejectedScans: rejectedScans.map(r => ({
        id: r.id,
        qrCodeId: r.qr_code_id,
        qrCode: r.qr_code,
        eventId: r.event_id,
        activityId: r.activity_id,
        scannedBy: r.scanned_by,
        scannedAt: r.scanned_at,
        attemptedAdmissionCount: r.attempted_admission_count,
        reason: r.reason,
      })),
    };
  });
