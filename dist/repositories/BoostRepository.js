"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoostRepository = void 0;
class BoostRepository {
    constructor(db) {
        this.db = db;
    }
    async activate(userId, minutes = 30) {
        await this.db.execute(`INSERT INTO boosts (user_id, start_time, end_time, is_active)
       VALUES (?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), 1)`, [userId, minutes]);
        const { rows } = await this.db.query(`SELECT * FROM boosts WHERE user_id = ? ORDER BY start_time DESC LIMIT 1`, [userId]);
        return rows[0];
    }
    async deactivateExpired() {
        await this.db.execute(`UPDATE boosts SET is_active = 0 WHERE is_active = 1 AND end_time < CURRENT_TIMESTAMP`);
    }
    async hasActive(userId) {
        const { rows } = await this.db.query(`SELECT 1 FROM boosts WHERE user_id = ? AND is_active = 1 AND start_time <= CURRENT_TIMESTAMP AND end_time >= CURRENT_TIMESTAMP LIMIT 1`, [userId]);
        return Array.isArray(rows) && rows.length > 0;
    }
    async lastActivation(userId) {
        const { rows } = await this.db.query(`SELECT * FROM boosts WHERE user_id = ? ORDER BY start_time DESC LIMIT 1`, [userId]);
        return rows[0] ?? null;
    }
    async countSince(userId, sinceIso) {
        const { rows } = await this.db.query(`SELECT COUNT(*) AS c FROM boosts WHERE user_id = ? AND start_time >= ?`, [userId, sinceIso]);
        return Number(rows[0]?.c ?? 0);
    }
    async listActiveIds(candidates) {
        if (candidates && candidates.length > 0) {
            const placeholders = candidates.map(() => '?').join(',');
            const { rows } = await this.db.query(`SELECT DISTINCT user_id FROM boosts WHERE is_active = 1 AND start_time <= CURRENT_TIMESTAMP AND end_time >= CURRENT_TIMESTAMP AND user_id IN (${placeholders})`, candidates);
            return rows.map((r) => Number(r.user_id));
        }
        const { rows } = await this.db.query(`SELECT DISTINCT user_id FROM boosts WHERE is_active = 1 AND start_time <= CURRENT_TIMESTAMP AND end_time >= CURRENT_TIMESTAMP`);
        return rows.map((r) => Number(r.user_id));
    }
}
exports.BoostRepository = BoostRepository;
