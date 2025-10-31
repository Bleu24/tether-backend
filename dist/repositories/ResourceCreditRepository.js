"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceCreditRepository = void 0;
class ResourceCreditRepository {
    constructor(db) {
        this.db = db;
    }
    async add(userId, type, amount, expiresAtIso) {
        await this.db.execute(`INSERT INTO resource_credits (user_id, type, amount, expires_at) VALUES (?, ?, ?, ?)`, [userId, type, amount, expiresAtIso]);
    }
    async sumActive(userId, type) {
        const { rows } = await this.db.query(`SELECT COALESCE(SUM(amount),0) AS total FROM resource_credits WHERE user_id = ? AND type = ? AND expires_at > CURRENT_TIMESTAMP`, [userId, type]);
        return Number(rows[0]?.total ?? 0);
    }
    async cleanupExpired() {
        await this.db.execute(`DELETE FROM resource_credits WHERE expires_at <= CURRENT_TIMESTAMP`);
    }
}
exports.ResourceCreditRepository = ResourceCreditRepository;
