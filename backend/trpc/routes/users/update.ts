import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const updateUserProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(['admin', 'guest']).optional(),
    assignedEventIds: z.array(z.string()).optional(),
    scannerEnabled: z.boolean().optional(),
  }))
  .mutation(({ input }) => {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(input.id) as any;
    if (!existing) throw new Error('User not found');

    db.prepare(`
      UPDATE users SET
        name = ?,
        email = ?,
        password = ?,
        role = ?,
        assigned_event_ids = ?,
        scanner_enabled = ?
      WHERE id = ?
    `).run(
      input.name?.trim() ?? existing.name,
      input.email?.trim().toLowerCase() ?? existing.email,
      input.password ?? existing.password,
      input.role ?? existing.role,
      input.assignedEventIds !== undefined
        ? JSON.stringify(input.assignedEventIds)
        : existing.assigned_event_ids,
      input.scannerEnabled !== undefined
        ? (input.scannerEnabled ? 1 : 0)
        : existing.scanner_enabled,
      input.id,
    );

    const row = db.prepare(
      'SELECT id, name, email, password, role, assigned_event_ids, scanner_enabled, created_at FROM users WHERE id = ?'
    ).get(input.id) as any;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role,
      assignedEventIds: JSON.parse(row.assigned_event_ids || '[]'),
      scannerEnabled: row.scanner_enabled === 1,
      createdAt: row.created_at,
    };
  });
