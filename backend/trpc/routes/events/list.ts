import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const listEventsProcedure = publicProcedure
  .query(() => {
    const rows = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      location: row.location || '',
      isMultiDay: row.is_multi_day === 1,
      startDate: row.start_date,
      endDate: row.end_date || undefined,
      invitedGuests: row.invited_guests || 0,
      createdBy: row.created_by,
      activities: JSON.parse(row.activities || '[]'),
      createdAt: row.created_at,
    }));
  });
