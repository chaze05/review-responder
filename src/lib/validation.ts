import { z } from "zod";

const toneSchema = z.enum(["friendly", "professional", "apologetic"]);

export const replyInputSchema = z.object({
  businessName: z.string().trim().max(100).default(""),
  reviewText: z.string().trim().min(20).max(1_500),
  rating: z.number().int().min(1).max(5).nullable().default(null),
  tone: toneSchema.default("friendly"),
});

export const saveReplySchema = replyInputSchema.extend({
  replyText: z.string().trim().min(1).max(600),
});

export type ReplyInput = z.infer<typeof replyInputSchema>;
export type SaveReplyInput = z.infer<typeof saveReplySchema>;

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formRating(formData: FormData): number | null {
  const raw = formString(formData, "rating").trim();
  return raw ? Number(raw) : null;
}

function formTone(formData: FormData): string | undefined {
  const raw = formString(formData, "tone").trim();
  return raw || undefined;
}

function firstIssue(result: z.ZodSafeParseResult<unknown>): string {
  return result.success
    ? ""
    : result.error.issues[0]?.message ?? "Invalid input.";
}

export function parseReplyInput(
  formData: FormData
):
  | { success: true; data: ReplyInput }
  | { success: false; error: string } {
  const result = replyInputSchema.safeParse({
    businessName: formString(formData, "businessName"),
    reviewText: formString(formData, "reviewText"),
    rating: formRating(formData),
    tone: formTone(formData),
  });

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: firstIssue(result) };
}

export function parseSaveReply(
  formData: FormData
):
  | { success: true; data: SaveReplyInput }
  | { success: false; error: string } {
  const result = saveReplySchema.safeParse({
    businessName: formString(formData, "businessName"),
    reviewText: formString(formData, "reviewText"),
    rating: formRating(formData),
    tone: formTone(formData),
    replyText: formString(formData, "replyText"),
  });

  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: firstIssue(result) };
}
