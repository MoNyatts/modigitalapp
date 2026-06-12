import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const deleteEventProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(({ input }) => {
    db.prepare('DELETE FROM events WHERE id = ?').run(input.id);
    return { success: true };
  });
