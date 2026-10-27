"use server";

import { generateText, isAiConfigured } from "@/lib/ai";
import {
  REPLY_SYSTEM_INSTRUCTION,
  buildReplyPrompt,
  cleanReply,
  isSafeReply,
} from "@/lib/prompt";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { parseReplyInput, parseSaveReply } from "@/lib/validation";

const RATE_WINDOW_MS = 60 * 60 * 1000;
const USAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function generateReply(
  formData: FormData
): Promise<{ text: string } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
    const windowStart = new Date(now.getTime() - RATE_WINDOW_MS).toISOString();

    const { data: usageRows, error: usageError } = await supabase
      .from("ai_usage")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", windowStart);

    if (usageError) {
      console.error("[ai] usage lookup failed:", usageError.message);
      return { error: "Could not check the AI limit. Please try again." };
    }

    const timestamps = ((usageRows ?? []) as Array<{ created_at: string }>).map(
      (row) => new Date(row.created_at)
    );
    const limit = checkRateLimit(timestamps, now);

    if (limit.limited) {
      const minutes = limit.retryMinutes;
      return {
        error: `AI limit reached. Try again in ${minutes} minute${
          minutes === 1 ? "" : "s"
        }.`,
      };
    }

    const { error: usageInsertError } = await supabase
      .from("ai_usage")
      .insert({ user_id: user.id });

    if (usageInsertError) {
      console.error("[ai] usage insert failed:", usageInsertError.message);
      return { error: "Could not start the AI request. Please try again." };
    }

    const prompt = buildReplyPrompt(parsed.data);
    const raw = await generateText(prompt, REPLY_SYSTEM_INSTRUCTION);
    const text = cleanReply(raw);

    if (!text || !isSafeReply(text)) {
      return { error: "AI returned an unusable response. Please try again." };
    }

    await supabase
      .from("ai_usage")
      .delete()
      .eq("user_id", user.id)
      .lt("created_at", new Date(Date.now() - USAGE_RETENTION_MS).toISOString());

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    const parsed = parseSaveReply(formData);
    if (!parsed.success) {
      return { error: parsed.error };
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        business_name: parsed.data.businessName,
        review_text: parsed.data.reviewText,
        rating: parsed.data.rating,
        tone: parsed.data.tone,
        reply_text: parsed.data.replyText,
      })
      .select("id, created_at")
      .single();

    if (error || !data) {
      console.error("[replies] save failed:", error?.message ?? "no row returned");
      return { error: "Could not save the reply. Please try again." };
    }

    return {
      id: data.id as string,
      created_at: data.created_at as string,
    };
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized" };
    }

    if (!id.trim()) {
      return { error: "Missing reply id." };
    }

    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) {
      console.error("[replies] delete failed:", error.message);
      return { error: "Could not delete the reply. Please try again." };
    }

    return { ok: true };
  } catch (error) {
    console.error(
      "[replies] delete failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: "Could not delete the reply. Please try again." };
  }
}
