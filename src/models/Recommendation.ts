export type Recommendation = {
  user_id: number;
  target_id: number;
  status: 'queued' | 'consumed';
  created_at: string;
  consumed_at: string | null;
};
