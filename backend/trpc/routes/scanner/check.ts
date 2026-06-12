import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const checkQRStatusProcedure = publicProcedure
  .input(z.object({
    qrCodeData: z.string(),
    eventId: z.string(),
    activityId: z.string(),
  }))
  .query(({ input }) => {
    const { qrCodeData, eventId, activityId } = input;

    const trimmed = qrCodeData.trim();
    const dashIdx = trimmed.indexOf(' - ');
    const codeNo = dashIdx !== -1 ? trimmed.substring(0, dashIdx).trim() : trimmed;

    const qrRow = db.prepare(
      'SELECT * FROM qr_codes WHERE (code = ? OR qr_hash = ?) AND event_id = ? AND is_valid = 1'
    ).get(codeNo, trimmed, eventId) as any;

    if (!qrRow) {
      return {
        found: false,
        isValid: false,
        totalUsed: 0,
        maxAdmissions: 0,
        remaining: 0,
        guestName: null,
        message: 'QR code not found for this event',
      };
    }

    const usedResult = db.prepare(
      'SELECT COALESCE(SUM(admission_count), 0) as total FROM scans WHERE qr_code_id = ? AND activity_id = ?'
    ).get(qrRow.id, activityId) as { total: number };
    const totalUsed = Number(usedResult.total);
    const remaining = qrRow.max_admissions - totalUsed;

    return {
      found: true,
      isValid: true,
      qrCodeId: qrRow.id,
      type: qrRow.type,
      guestName: qrRow.guest_name,
      phoneNumber: qrRow.phone_number,
      maxAdmissions: qrRow.max_admissions,
      totalUsed,
      remaining,
      isFullyUsed: remaining <= 0,
      message: remaining <= 0
        ? `Fully used (${totalUsed}/${qrRow.max_admissions})`
        : `${remaining} of ${qrRow.max_admissions} admission(s) remaining`,
    };
  });
