"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationRepository = void 0;
class RecommendationRepository {
    constructor(db) {
        this.db = db;
    }
    async getQueuedTargets(userId, limit = 50) {
        const { rows } = await this.db.query(`SELECT target_id FROM recommendation_queue WHERE user_id = ? AND status = 'queued' ORDER BY created_at ASC LIMIT ?`, [userId, limit]);
        return rows.map((r) => Number(r.target_id));
    }
    async ensureQueued(userId, targetIds) {
        if (targetIds.length === 0)
            return;
        const values = targetIds.map(() => '(?,?,"queued", CURRENT_TIMESTAMP, NULL)').join(',');
        const params = [];
        for (const t of targetIds) {
            params.push(userId, t);
        }
        await this.db.execute(`INSERT INTO recommendation_queue (user_id, target_id, status, created_at, consumed_at)
       VALUES ${values}
       ON DUPLICATE KEY UPDATE status = VALUES(status), created_at = IF(status='queued', created_at, VALUES(created_at)), consumed_at = NULL`, params);
    }
    async markConsumed(userId, targetId) {
        await this.db.execute(`UPDATE recommendation_queue SET status = 'consumed', consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND target_id = ?`, [userId, targetId]);
    }
    /**
     * Bump a queued target to the front by setting its created_at far in the past.
     */
    async prioritize(userId, targetId) {
        await this.db.execute(`UPDATE recommendation_queue SET created_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
       WHERE user_id = ? AND target_id = ? AND status = 'queued'`, [userId, targetId]);
    }
    /**
     * Clear all queued/consumed recommendations for a user. Useful when preferences change.
     */
    async clearForUser(userId) {
        await this.db.execute(`DELETE FROM recommendation_queue WHERE user_id = ?`, [userId]);
    }
}
exports.RecommendationRepository = RecommendationRepository;
