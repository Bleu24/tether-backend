"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperLikeRepository = void 0;
class SuperLikeRepository {
    constructor(db) {
        this.db = db;
    }
    async create(senderId, receiverId) {
        await this.db.execute(`INSERT INTO super_likes (sender_id, receiver_id) VALUES (?, ?)`, [senderId, receiverId]);
        const { rows } = await this.db.query(`SELECT * FROM super_likes WHERE sender_id = ? AND receiver_id = ? ORDER BY created_at DESC LIMIT 1`, [senderId, receiverId]);
        return rows[0];
    }
    async countSince(senderId, sinceIso) {
        const { rows } = await this.db.query(`SELECT COUNT(*) AS c FROM super_likes WHERE sender_id = ? AND created_at >= ?`, [senderId, sinceIso]);
        return Number(rows[0]?.c ?? 0);
    }
    async hasSent(senderId, receiverId) {
        const { rows } = await this.db.query(`SELECT 1 FROM super_likes WHERE sender_id = ? AND receiver_id = ? LIMIT 1`, [senderId, receiverId]);
        return Array.isArray(rows) && rows.length > 0;
    }
    async listSendersTo(userId, limit = 100) {
        const { rows } = await this.db.query(`SELECT sender_id FROM super_likes WHERE receiver_id = ? ORDER BY created_at DESC LIMIT ?`, [userId, limit]);
        return rows.map((r) => Number(r.sender_id));
    }
}
exports.SuperLikeRepository = SuperLikeRepository;
