import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const authenticateProcedure = publicProcedure
  .input(z.object({
    email: z.string(),
    password: z.string(),
  }))
  .mutation(({ input }) => {
    const user = db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(input.email.trim().toLowerCase()) as any;

    if (!user || user.password !== input.password) {
      return { success: false, user: null, message: 'Invalid email or password' };
    }

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        assignedEventIds: JSON.parse(user.assigned_event_ids || '[]'),
        scannerEnabled: user.scanner_enabled === 1,
        createdAt: user.created_at,
      },
    };
  });
