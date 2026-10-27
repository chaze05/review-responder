const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const REQUEST_TIMEOUT_MS = 20_000;

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("AI is not configured yet.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 400,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );

  const body = (await response.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    const detail = body?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`AI request failed: ${detail}`);
  }

  const text =
    body?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    throw new Error("AI returned an empty response. Please try again.");
  }

  return text;
}
