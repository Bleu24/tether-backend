"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwipeRepository = void 0;
class SwipeRepository {
    constructor(db) {
        this.db = db;
    }
    async createOrUpdate(swiperId, targetId, direction) {
        try {
            await this.db.execute(`INSERT INTO swipes (swiper_id, target_id, direction)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE direction = VALUES(direction), created_at = CURRENT_TIMESTAMP`, [swiperId, targetId, direction]);
            const { rows } = await this.db.query(`SELECT id, swiper_id, target_id, direction, created_at
                 FROM swipes WHERE swiper_id = ? AND target_id = ? LIMIT 1`, [swiperId, targetId]);
            return rows[0];
        }
        catch (err) {
            throw new Error(`SwipeRepository.createOrUpdate failed: ${err.message}`);
        }
    }
    async listBySwiper(swiperId, limit = 100) {
        try {
            const { rows } = await this.db.query(`SELECT id, swiper_id, target_id, direction, created_at
                 FROM swipes WHERE swiper_id = ? ORDER BY created_at DESC LIMIT ?`, [swiperId, limit]);
            return rows;
        }
        catch (err) {
            throw new Error(`SwipeRepository.listBySwiper failed: ${err.message}`);
        }
    }
    /**
     * Remove the swipe record if the current state is a PASS.
     * Used when a user undoes a rejection, so the pair can re-enter recommendations.
     */
    async deleteIfPass(swiperId, targetId) {
        try {
            const result = await this.db.execute(`DELETE FROM swipes WHERE swiper_id = ? AND target_id = ? AND direction = 'pass'`, [swiperId, targetId]);
            const affected = result?.[0]?.affectedRows ?? 0;
            return { affected };
        }
        catch (err) {
            throw new Error(`SwipeRepository.deleteIfPass failed: ${err.message}`);
        }
    }
}
exports.SwipeRepository = SwipeRepository;
