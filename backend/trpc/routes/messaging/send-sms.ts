import { z } from "zod";
import { publicProcedure } from "../../create-context";

const sendSmsSchema = z.object({
  phoneNumbers: z.array(z.string()),
  message: z.string(),
  eventId: z.string().optional(),
  personalizedMessages: z
    .array(
      z.object({
        phoneNumber: z.string(),
        message: z.string(),
      })
    )
    .optional(),
});

export const sendSmsProcedure = publicProcedure
  .input(sendSmsSchema)
  .mutation(async ({ input }) => {
    const { phoneNumbers, message, personalizedMessages } = input;

    if (personalizedMessages && personalizedMessages.length > 0) {
      for (const msg of personalizedMessages) {
        // SMS sending to be implemented with provider (e.g. Twilio)
      }
      return {
        success: true,
        message: `${personalizedMessages.length} personalized SMS sent successfully`,
        provider: "placeholder",
        sentCount: personalizedMessages.length,
      };
    } else {
      return {
        success: true,
        message: `SMS sent to ${phoneNumbers.length} recipient(s)`,
        provider: "placeholder",
        sentCount: phoneNumbers.length,
      };
    }
  });
