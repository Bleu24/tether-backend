export type Recommendation = {
  user_id: number;
  target_id: number;
  status: "queued" | "consumed";
  created_at: string; // ISO timestamp
  consumed_at: string | null; // ISO timestamp or null when queued
};
