import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { db } from '../../../db';
import type { AdmissionType } from '../../../../types';

function generateRandomHash(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function extractAdmissionType(codeNo: string): { type: AdmissionType; maxAdmissions: number } {
  const firstChar = codeNo.charAt(0).toUpperCase();
  if (firstChar === 'S') return { type: 'S', maxAdmissions: 1 };
  if (firstChar === 'D') return { type: 'D', maxAdmissions: 2 };
  if (firstChar === 'M') {
    const maxAdmissions = parseInt(codeNo.slice(1));
    return { type: 'M', maxAdmissions: isNaN(maxAdmissions) ? 1 : maxAdmissions };
  }
  return { type: 'S', maxAdmissions: 1 };
}

export const bulkUploadProcedure = publicProcedure
  .input(z.object({
    eventId: z.string(),
    fileName: z.string(),
    uploadedBy: z.string(),
    entries: z.array(z.object({
      codeNo: z.string(),
      name: z.string(),
      phoneNumber: z.string().optional(),
      additionalData: z.record(z.string(), z.string()).optional(),
    })),
  }))
  .mutation(({ input }) => {
    const uploadId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const uploadedAt = new Date().toISOString();

    const insertUpload = db.prepare(`
      INSERT INTO qr_bulk_uploads (id, event_id, file_name, total_codes, uploaded_by, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertQr = db.prepare(`
      INSERT OR REPLACE INTO qr_codes (id, code, qr_hash, name, type, event_id, max_admissions, guest_name, phone_number, bulk_upload_id, is_valid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const existingHashes = new Set<string>();
    const qrCodes: any[] = [];

    const doInsert = db.transaction(() => {
      insertUpload.run(uploadId, input.eventId, input.fileName, input.entries.length, input.uploadedBy, uploadedAt);

      for (const entry of input.entries) {
        let qrHash = generateRandomHash(8);
        while (existingHashes.has(qrHash)) qrHash = generateRandomHash(8);
        existingHashes.add(qrHash);

        const { type, maxAdmissions } = extractAdmissionType(entry.codeNo);
        const qrId = `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        insertQr.run(qrId, entry.codeNo, qrHash, entry.name, type, input.eventId, maxAdmissions, entry.name, entry.phoneNumber || null, uploadId);

        qrCodes.push({
          id: qrId,
          code: entry.codeNo,
          qrHash,
          name: entry.name,
          type,
          eventId: input.eventId,
          maxAdmissions,
          guestName: entry.name,
          phoneNumber: entry.phoneNumber,
          isValid: true,
          createdAt: uploadedAt,
        });
      }
    });

    doInsert();

    return {
      bulkUpload: {
        id: uploadId,
        eventId: input.eventId,
        fileName: input.fileName,
        totalCodes: input.entries.length,
        uploadedBy: input.uploadedBy,
        uploadedAt,
        codes: qrCodes,
      },
      qrCodes,
    };
  });
