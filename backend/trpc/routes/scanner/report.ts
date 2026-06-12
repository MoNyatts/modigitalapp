import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';

export const scanReportProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
    activityId: z.string(),
  }))
  .query(({ input }) => {
    const totalAdmissions = Number((db.prepare(
      'SELECT COALESCE(SUM(admission_count), 0) as total FROM scans WHERE event_id = ? AND activity_id = ?'
    ).get(input.eventId, input.activityId) as any).total);

    const uniqueCodesScanned = Number((db.prepare(
      'SELECT COUNT(DISTINCT qr_code_id) as cnt FROM scans WHERE event_id = ? AND activity_id = ?'
    ).get(input.eventId, input.activityId) as any).cnt);

    const totalScanEvents = Number((db.prepare(
      'SELECT COUNT(*) as cnt FROM scans WHERE event_id = ? AND activity_id = ?'
    ).get(input.eventId, input.activityId) as any).cnt);

    const rejectedCount = Number((db.prepare(
      'SELECT COUNT(*) as cnt FROM rejected_scans WHERE event_id = ? AND activity_id = ?'
    ).get(input.eventId, input.activityId) as any).cnt);

    const totalQrCodes = Number((db.prepare(
      'SELECT COUNT(*) as cnt FROM qr_codes WHERE event_id = ? AND is_valid = 1'
    ).get(input.eventId) as any).cnt);

    // Type breakdown
    const typeStats = db.prepare(`
      SELECT q.type, COUNT(DISTINCT s.qr_code_id) as count, SUM(s.admission_count) as admissions
      FROM scans s
      LEFT JOIN qr_codes q ON q.id = s.qr_code_id
      WHERE s.event_id = ? AND s.activity_id = ?
      GROUP BY q.type
    `).all(input.eventId, input.activityId) as any[];

    const singleAdmissions = typeStats.find(t => t.type === 'S')?.admissions || 0;
    const doubleAdmissions = typeStats.find(t => t.type === 'D')?.admissions || 0;
    const multipleAdmissions = typeStats.find(t => t.type === 'M')?.admissions || 0;

    return {
      totalAdmissions,
      uniqueCodesScanned,
      totalScanEvents,
      rejectedScans: rejectedCount,
      totalQrCodes,
      admissionRate: totalQrCodes > 0 ? Math.round((uniqueCodesScanned / totalQrCodes) * 100) : 0,
      singleAdmissions: Number(singleAdmissions),
      doubleAdmissions: Number(doubleAdmissions),
      multipleAdmissions: Number(multipleAdmissions),
    };
  });
