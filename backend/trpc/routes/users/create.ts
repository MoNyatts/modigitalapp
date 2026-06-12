import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const createUserProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['admin', 'guest']).default('guest'),
    assignedEventIds: z.array(z.string()).optional().default([]),
    scannerEnabled: z.boolean().optional().default(true),
  }))
  .mutation(({ input }) => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email.trim().toLowerCase());
    if (existing) throw new Error('A user with this email already exists');

    db.prepare(`
      INSERT INTO users (id, name, email, password, role, assigned_event_ids, scanner_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.password,
      input.role,
      JSON.stringify(input.assignedEventIds || []),
      input.scannerEnabled !== false ? 1 : 0,
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
