export type Match = {
    id: number;
    user_a_id: number;
    user_b_id: number;
    is_active: 0 | 1;
    created_at: string; // ISO
    // celebration flags indicate whether each participant has already seen the match animation/overlay
    celebration_shown_to_a?: 0 | 1;
    celebration_shown_to_b?: 0 | 1;
};
