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

export const updateEventProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    isMultiDay: z.boolean().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    invitedGuests: z.number().optional(),
    activities: z.array(activitySchema).optional(),
  }))
  .mutation(({ input }) => {
    const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(input.id) as any;
    if (!existing) throw new Error(`Event ${input.id} not found`);

    db.prepare(`
      UPDATE events SET
        name = ?,
        description = ?,
        location = ?,
        is_multi_day = ?,
        start_date = ?,
        end_date = ?,
        invited_guests = ?,
        activities = ?
      WHERE id = ?
    `).run(
      input.name ?? existing.name,
      input.description ?? existing.description,
      input.location ?? existing.location,
      input.isMultiDay !== undefined ? (input.isMultiDay ? 1 : 0) : existing.is_multi_day,
      input.startDate ?? existing.start_date,
      input.endDate !== undefined ? input.endDate : existing.end_date,
      input.invitedGuests !== undefined ? input.invitedGuests : existing.invited_guests,
      input.activities !== undefined ? JSON.stringify(input.activities) : existing.activities,
      input.id,
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
