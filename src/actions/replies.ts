"use server";

import { generateText, isAiConfigured } from "@/lib/ai";
import { withUser } from "@/lib/db";
import {
  REPLY_SYSTEM_INSTRUCTION,
  buildReplyPrompt,
  cleanReply,
  isSafeReply,
} from "@/lib/prompt";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session-cookies";
import { parseReplyInput, parseSaveReply } from "@/lib/validation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateReply(
  formData: FormData
): Promise<{ text: string } | { error: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const parsed = parseReplyInput(formData);
    if (!parsed.success) {
      return { error: parsed.error };
    }

    if (!isAiConfigured()) {
      return {
        error: "AI is not configured yet. Add GEMINI_API_KEY to enable this.",
      };
    }

    const now = new Date();
    const limit = await withUser(session.userId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [
        session.userId,
      ]);

      const { rows } = await client.query(
        `select created_at
         from public.ai_usage
         where user_id = $1
           and created_at >= now() - interval '1 hour'`,
        [session.userId]
      );

      const timestamps = rows.map((row) => new Date(row.created_at));
      const result = checkRateLimit(timestamps, now);

      if (!result.limited) {
        await client.query(
          "insert into public.ai_usage (user_id) values ($1)",
          [session.userId]
        );
      }

      return result;
    });

    if (limit.limited) {
      const minutes = limit.retryMinutes;
      return {
        error: `AI limit reached. Try again in ${minutes} minute${
          minutes === 1 ? "" : "s"
        }.`,
      };
    }

    const prompt = buildReplyPrompt(parsed.data);
    const raw = await generateText(prompt, REPLY_SYSTEM_INSTRUCTION);
    const text = cleanReply(raw);

    if (!text || !isSafeReply(text)) {
      return { error: "AI returned an unusable response. Please try again." };
    }

    await withUser(session.userId, (client) =>
      client.query(
        `delete from public.ai_usage
         where user_id = $1
           and created_at < now() - interval '7 days'`,
        [session.userId]
      )
    ).catch(() => {});

    return { text };
  } catch (error) {
    console.error(
      "[ai] generate failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: "Could not generate a reply. Please try again." };
  }
}

export async function saveReply(
  formData: FormData
): Promise<{ id: string; created_at: string } | { error: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const parsed = parseSaveReply(formData);
    if (!parsed.success) {
      return { error: parsed.error };
    }

    const result = await withUser(session.userId, async (client) => {
      const count = await client.query<{ count: number }>(
        `select count(*)::int as count
         from public.reviews
         where user_id = $1
           and created_at >= now() - interval '1 hour'`,
        [session.userId]
      );

      if (Number(count.rows[0]?.count ?? 0) >= 100) {
        return { limited: true as const };
      }

      const inserted = await client.query(
        `insert into public.reviews
           (user_id, business_name, review_text, rating, tone, reply_text)
         values ($1, $2, $3, $4, $5, $6)
         returning id, created_at`,
        [
          session.userId,
          parsed.data.businessName,
          parsed.data.reviewText,
          parsed.data.rating,
          parsed.data.tone,
          parsed.data.replyText,
        ]
      );

      const row = inserted.rows[0];
      if (!row) {
        throw new Error("insert returned no row");
      }

      return {
        limited: false as const,
        id: String(row.id),
        created_at: new Date(row.created_at).toISOString(),
      };
    });

    if (result.limited) {
      return { error: "Save limit reached for this hour. Please try again later." };
    }

    return { id: result.id, created_at: result.created_at };
  } catch (error) {
    console.error(
      "[replies] save failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: "Could not save the reply. Please try again." };
  }
}

export async function deleteReply(
  id: string
): Promise<{ ok: true } | { error: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    if (!UUID_PATTERN.test(id)) {
      return { error: "Invalid reply id." };
    }

    await withUser(session.userId, (client) =>
      client.query("delete from public.reviews where id = $1 and user_id = $2", [
        id,
        session.userId,
      ])
    );

    return { ok: true };
  } catch (error) {
    console.error(
      "[replies] delete failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: "Could not delete the reply. Please try again." };
  }
}
