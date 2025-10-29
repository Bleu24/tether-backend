import { IDatabase } from "../interfaces/IDatabase";
import { Swipe } from "../models/Swipe";

export interface ISwipeRepository {
    createOrUpdate(swiperId: number, targetId: number, direction: "like" | "pass"): Promise<Swipe>;
    listBySwiper(swiperId: number, limit?: number): Promise<Swipe[]>;
}

export class SwipeRepository implements ISwipeRepository {
    constructor(private readonly db: IDatabase) { }

    async createOrUpdate(swiperId: number, targetId: number, direction: "like" | "pass"): Promise<Swipe> {
        try {
            await this.db.execute(
                `INSERT INTO swipes (swiper_id, target_id, direction)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE direction = VALUES(direction), created_at = CURRENT_TIMESTAMP`,
                [swiperId, targetId, direction]
            );
            const { rows } = await this.db.query<Swipe>(
                `SELECT id, swiper_id, target_id, direction, created_at
                 FROM swipes WHERE swiper_id = ? AND target_id = ? LIMIT 1`,
                [swiperId, targetId]
            );
            return rows[0];
        } catch (err) {
            throw new Error(`SwipeRepository.createOrUpdate failed: ${(err as Error).message}`);
        }
    }

    async listBySwiper(swiperId: number, limit = 100): Promise<Swipe[]> {
        try {
            const { rows } = await this.db.query<Swipe>(
                `SELECT id, swiper_id, target_id, direction, created_at
                 FROM swipes WHERE swiper_id = ? ORDER BY created_at DESC LIMIT ?`,
                [swiperId, limit]
            );
            return rows;
        } catch (err) {
            throw new Error(`SwipeRepository.listBySwiper failed: ${(err as Error).message}`);
        }
    }
}
