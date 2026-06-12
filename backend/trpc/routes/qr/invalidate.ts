import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const invalidateProcedure = publicProcedure
  .input(z.object({
    qrCodeId: z.string(),
    reason: z.string(),
  }))
  .mutation(({ input }) => {
    const existing = db.prepare('SELECT id FROM qr_codes WHERE id = ?').get(input.qrCodeId);
    if (!existing) throw new Error('QR code not found');

    db.prepare('UPDATE qr_codes SET is_valid = 0 WHERE id = ?').run(input.qrCodeId);

    return {
      success: true,
      message: `QR code invalidated: ${input.reason}`,
    };
  });
