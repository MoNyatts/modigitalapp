import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const validateProcedure = publicProcedure
  .input(z.object({
    qrHashOrCodeNo: z.string(),
    eventId: z.string(),
  }))
  .query(({ input }) => {
    const qr = db.prepare(`
      SELECT * FROM qr_codes
      WHERE (code = ? OR qr_hash = ?) AND event_id = ? AND is_valid = 1
    `).get(input.qrHashOrCodeNo, input.qrHashOrCodeNo, input.eventId) as any;

    if (!qr) {
      return { isValid: false, qrCode: null, message: 'QR code not found for this event' };
    }

    return {
      isValid: true,
      qrCode: {
        id: qr.id,
        code: qr.code,
        qrHash: qr.qr_hash,
        name: qr.name,
        type: qr.type,
        eventId: qr.event_id,
        maxAdmissions: qr.max_admissions,
        guestName: qr.guest_name,
        phoneNumber: qr.phone_number,
        isValid: true,
        createdAt: qr.created_at,
      },
      message: 'QR code is valid',
    };
  });
