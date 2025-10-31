"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectionRepository = void 0;
class RejectionRepository {
    constructor(db) {
        this.db = db;
    }
    async add(swiperId, targetId) {
        await this.db.execute(`INSERT INTO rejections (swiper_id, target_id, created_at, undone_at)
       VALUES (?, ?, CURRENT_TIMESTAMP, NULL)
       ON DUPLICATE KEY UPDATE undone_at = NULL, created_at = CURRENT_TIMESTAMP`, [swiperId, targetId]);
    }
    async undo(swiperId, targetId) {
        // Semantics: fully clear the rejection entry on undo
        const result = await this.db.execute(`DELETE FROM rejections WHERE swiper_id = ? AND target_id = ?`, [swiperId, targetId]);
        const affected = result?.[0]?.affectedRows ?? 0;
        return { affected };
    }
    async listActiveRejectedIds(swiperId) {
        const { rows } = await this.db.query(`SELECT target_id FROM rejections WHERE swiper_id = ? AND undone_at IS NULL`, [swiperId]);
        return rows.map((r) => Number(r.target_id));
    }
}
exports.RejectionRepository = RejectionRepository;
