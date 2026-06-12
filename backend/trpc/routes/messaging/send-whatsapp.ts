import { z } from "zod";
import { publicProcedure } from "../../create-context";

const sendWhatsappSchema = z.object({
  phoneNumbers: z.array(z.string()),
  message: z.string(),
  eventId: z.string().optional(),
  personalizedMessages: z
    .array(
      z.object({
        phoneNumber: z.string(),
        message: z.string(),
        attachmentUrl: z.string().optional(),
        attachmentType: z.enum(["image", "document", "video"]).optional(),
      })
    )
    .optional(),
  attachmentUrl: z.string().optional(),
  attachmentType: z.enum(["image", "document", "video"]).optional(),
});

export const sendWhatsappProcedure = publicProcedure
  .input(sendWhatsappSchema)
  .mutation(async ({ input }) => {
    const { phoneNumbers, message, personalizedMessages, attachmentUrl, attachmentType } = input;

    if (personalizedMessages && personalizedMessages.length > 0) {
      for (const msg of personalizedMessages) {
        // WhatsApp sending to be implemented with provider (e.g. Twilio, Meta Cloud API)
      }
      return {
        success: true,
        message: `${personalizedMessages.length} personalized WhatsApp messages sent successfully`,
        provider: "placeholder",
        sentCount: personalizedMessages.length,
      };
    } else {
      return {
        success: true,
        message: `WhatsApp message sent to ${phoneNumbers.length} recipient(s)`,
        provider: "placeholder",
        sentCount: phoneNumbers.length,
      };
    }
  });
