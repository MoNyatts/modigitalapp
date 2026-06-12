import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

const activitySchema = z.object({
  id: z.string(),
  eventId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isActive: z.boolean().optional(),
  day: z.number().optional(),
  sendWelcomeMessage: z.boolean().optional(),
  welcomeMessage: z.string().optional(),
});

export const createEventProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    isMultiDay: z.boolean().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    invitedGuests: z.number().optional(),
    createdBy: z.string(),
    activities: z.array(activitySchema).optional(),
  }))
  .mutation(({ input }) => {
    db.prepare(`
      INSERT INTO events (id, name, description, location, is_multi_day, start_date, end_date, invited_guests, created_by, activities)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id,
      input.name,
      input.description || '',
      input.location || '',
      input.isMultiDay ? 1 : 0,
      input.startDate,
      input.endDate || null,
      input.invitedGuests || 0,
      input.createdBy,
      JSON.stringify(input.activities || []),
    );
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(input.id) as any;
    return {
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
    };
  });
