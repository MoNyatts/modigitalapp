import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const listQRCodesProcedure = publicProcedure
  .input(z.object({ eventId: z.string() }))
  .query(({ input }) => {
    const rows = db.prepare('SELECT * FROM qr_codes WHERE event_id = ? ORDER BY created_at').all(input.eventId) as any[];
    return rows.map(row => ({
      id: row.id,
      code: row.code,
      qrHash: row.qr_hash,
      name: row.name,
      type: row.type,
      eventId: row.event_id,
      maxAdmissions: row.max_admissions,
      guestName: row.guest_name,
      phoneNumber: row.phone_number,
      isValid: row.is_valid === 1,
      createdAt: row.created_at,
    }));
  });

// Keep the old export name for backward compatibility
export const listProcedure = listQRCodesProcedure;
