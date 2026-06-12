import { z } from "zod";
import { publicProcedure } from "../../create-context";
import QRCode from "qrcode";

const downloadQRCodesSchema = z.object({
  eventId: z.string(),
  bulkUploadId: z.string(),
});

export const downloadQRCodesProcedure = publicProcedure
  .input(downloadQRCodesSchema)
  .query(async ({ input, ctx }) => {
    return {
      qrCodes: [],
    };
  });
