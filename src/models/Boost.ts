export type Boost = {
  id: number;
  user_id: number;
  start_time: string; // ISO timestamp
  end_time: string;   // ISO timestamp
  is_active: number;  // 0/1
};
