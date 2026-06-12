import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const deleteUserProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(({ input }) => {
    const existing = db.prepare('SELECT id, role FROM users WHERE id = ?').get(input.id) as any;
    if (!existing) throw new Error('User not found');

    // Prevent deleting the last admin
    if (existing.role === 'admin') {
      const adminCount = (db.prepare(
        "SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'"
      ).get() as any).cnt;
      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(input.id);
    return { success: true };
  });
