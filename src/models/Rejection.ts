export type Rejection = {
  swiper_id: number;
  target_id: number;
  created_at: string; // ISO timestamp
  undone_at: string | null; // ISO timestamp or null when active
};
