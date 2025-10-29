export type SwipeDirection = "like" | "pass";

export type Swipe = {
    id?: number;
    swiper_id: number; // the user who swiped
    target_id: number; // the profile being swiped on
    direction: SwipeDirection;
    created_at: string; // ISO timestamp
};
