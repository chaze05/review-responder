export type Tone = "friendly" | "professional" | "apologetic";

export interface Reply {
  id: string;
  user_id: string;
  business_name: string;
  review_text: string;
  rating: number | null;
  tone: Tone;
  reply_text: string;
  created_at: string;
}
