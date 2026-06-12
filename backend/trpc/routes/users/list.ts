import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const listUsersProcedure = publicProcedure
  .query(() => {
    const rows = db.prepare(
      'SELECT id, name, email, password, role, assigned_event_ids, scanner_enabled, created_at FROM users ORDER BY created_at'
    ).all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role,
      assignedEventIds: JSON.parse(row.assigned_event_ids || '[]'),
      scannerEnabled: row.scanner_enabled === 1,
      createdAt: row.created_at,
    }));
  });
