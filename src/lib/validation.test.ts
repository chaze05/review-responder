import { describe, expect, it } from "vitest";

import { parseReplyInput, replyInputSchema, saveReplySchema } from "./validation";

const valid = {
  businessName: "Acme Salon",
  reviewText: "Great service and friendly staff!",
  rating: 5,
  tone: "friendly" as const,
};

describe("replyInputSchema", () => {
  it("accepts a 20-character review", () => {
    expect(
      replyInputSchema.safeParse({ ...valid, reviewText: "x".repeat(20) }).success
    ).toBe(true);
  });

  it("rejects a 19-character review", () => {
    expect(
      replyInputSchema.safeParse({ ...valid, reviewText: "x".repeat(19) }).success
    ).toBe(false);
  });

  it("accepts a 1,500-character review", () => {
    expect(
      replyInputSchema.safeParse({ ...valid, reviewText: "x".repeat(1_500) }).success
    ).toBe(true);
  });

  it("rejects a 1,501-character review", () => {
    expect(
      replyInputSchema.safeParse({ ...valid, reviewText: "x".repeat(1_501) }).success
    ).toBe(false);
  });

  it("rejects an empty review", () => {
    expect(
      replyInputSchema.safeParse({ ...valid, reviewText: "" }).success
    ).toBe(false);
  });

  it("defaults tone to friendly and business name to empty", () => {
    const parsed = replyInputSchema.parse({ reviewText: valid.reviewText });

    expect(parsed.tone).toBe("friendly");
    expect(parsed.businessName).toBe("");
  });

  it("rejects an invalid tone", () => {
    expect(
      replyInputSchema.safeParse({ ...valid, tone: "sarcastic" }).success
    ).toBe(false);
  });

  it("accepts a 100-character business name and rejects 101", () => {
    expect(
      replyInputSchema.safeParse({ ...valid, businessName: "x".repeat(100) }).success
    ).toBe(true);
    expect(
      replyInputSchema.safeParse({ ...valid, businessName: "x".repeat(101) }).success
    ).toBe(false);
  });

  it("accepts omitted and null ratings", () => {
    const withoutRating = {
      businessName: valid.businessName,
      reviewText: valid.reviewText,
      tone: valid.tone,
    };

    expect(replyInputSchema.safeParse(withoutRating).success).toBe(true);
    expect(replyInputSchema.safeParse({ ...valid, rating: null }).success).toBe(true);
  });

  it("accepts ratings 1 and 5 but rejects 0 and 6", () => {
    expect(replyInputSchema.safeParse({ ...valid, rating: 1 }).success).toBe(true);
    expect(replyInputSchema.safeParse({ ...valid, rating: 5 }).success).toBe(true);
    expect(replyInputSchema.safeParse({ ...valid, rating: 0 }).success).toBe(false);
    expect(replyInputSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
  });

  it("trims text fields before measuring them", () => {
    const parsed = replyInputSchema.parse({
      ...valid,
      businessName: "  Acme Salon  ",
      reviewText: `  ${"x".repeat(20)}  `,
    });

    expect(parsed.businessName).toBe("Acme Salon");
    expect(parsed.reviewText).toBe("x".repeat(20));
  });
});

describe("saveReplySchema", () => {
  it("accepts a 600-character reply", () => {
    expect(
      saveReplySchema.safeParse({ ...valid, replyText: "x".repeat(600) }).success
    ).toBe(true);
  });

  it("rejects a 601-character reply", () => {
    expect(
      saveReplySchema.safeParse({ ...valid, replyText: "x".repeat(601) }).success
    ).toBe(false);
  });

  it("rejects an empty reply", () => {
    expect(saveReplySchema.safeParse({ ...valid, replyText: "" }).success).toBe(false);
  });
});

describe("parseReplyInput", () => {
  it("parses FormData and applies defaults", () => {
    const formData = new FormData();
    formData.set("reviewText", valid.reviewText);

    const result = parseReplyInput(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tone).toBe("friendly");
      expect(result.data.businessName).toBe("");
      expect(result.data.rating).toBeNull();
    }
  });

  it("parses an explicit rating and tone", () => {
    const formData = new FormData();
    formData.set("reviewText", valid.reviewText);
    formData.set("rating", "4");
    formData.set("tone", "professional");
    formData.set("businessName", "Acme Salon");

    const result = parseReplyInput(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rating).toBe(4);
      expect(result.data.tone).toBe("professional");
      expect(result.data.businessName).toBe("Acme Salon");
    }
  });

  it("returns an error for invalid FormData", () => {
    const formData = new FormData();
    formData.set("reviewText", "too short");

    const result = parseReplyInput(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
