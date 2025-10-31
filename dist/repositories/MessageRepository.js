"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRepository = void 0;
class MessageRepository {
    constructor(db) {
        this.db = db;
    }
    async listByMatch(matchId, userId, limit = 200) {
        try {
            if (userId) {
                const { rows } = await this.db.query(`SELECT m.id, m.match_id, m.sender_id, m.content, m.is_deleted, m.seen, m.created_at, m.updated_at
                     FROM messages m
                     LEFT JOIN message_deletions md ON md.message_id = m.id AND md.user_id = ?
                     WHERE m.match_id = ? AND md.message_id IS NULL
                     ORDER BY m.created_at ASC LIMIT ?`, [userId, matchId, limit]);
                return rows;
            }
            const { rows } = await this.db.query(`SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at
                 FROM messages WHERE match_id = ? ORDER BY created_at ASC LIMIT ?`, [matchId, limit]);
            return rows;
        }
        catch (err) {
            throw new Error(`MessageRepository.listByMatch failed: ${err.message}`);
        }
    }
    async getLatestForMatch(matchId, userId) {
        try {
            if (userId) {
                const { rows } = await this.db.query(`SELECT m.id, m.match_id, m.sender_id, m.content, m.is_deleted, m.seen, m.created_at, m.updated_at
                     FROM messages m
                     LEFT JOIN message_deletions md ON md.message_id = m.id AND md.user_id = ?
                     WHERE m.match_id = ? AND md.message_id IS NULL
                     ORDER BY m.created_at DESC LIMIT 1`, [userId, matchId]);
                return rows[0] ?? null;
            }
            const { rows } = await this.db.query(`SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at
                 FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1`, [matchId]);
            return rows[0] ?? null;
        }
        catch (err) {
            throw new Error(`MessageRepository.getLatestForMatch failed: ${err.message}`);
        }
    }
    async create(matchId, senderId, content) {
        try {
            await this.db.execute(`INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)`, [matchId, senderId, content]);
            const { rows } = await this.db.query(`SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at
                 FROM messages WHERE match_id = ? AND sender_id = ? ORDER BY id DESC LIMIT 1`, [matchId, senderId]);
            return rows[0];
        }
        catch (err) {
            throw new Error(`MessageRepository.create failed: ${err.message}`);
        }
    }
    async getById(id) {
        try {
            const { rows } = await this.db.query(`SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at FROM messages WHERE id = ? LIMIT 1`, [id]);
            return rows[0] ?? null;
        }
        catch (err) {
            throw new Error(`MessageRepository.getById failed: ${err.message}`);
        }
    }
    async updateContent(id, senderId, content) {
        try {
            await this.db.execute(`UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ? AND is_deleted = 0`, [content, id, senderId]);
            const { rows } = await this.db.query(`SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at FROM messages WHERE id = ?`, [id]);
            return rows[0];
        }
        catch (err) {
            throw new Error(`MessageRepository.updateContent failed: ${err.message}`);
        }
    }
    async deleteForEveryone(id, requesterId) {
        try {
            await this.db.execute(`UPDATE messages SET is_deleted = 1, content = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ?`, [id, requesterId]);
        }
        catch (err) {
            throw new Error(`MessageRepository.deleteForEveryone failed: ${err.message}`);
        }
    }
    async deleteForUser(id, userId) {
        try {
            await this.db.execute(`INSERT INTO message_deletions (message_id, user_id, deleted_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                                   ON DUPLICATE KEY UPDATE deleted_at = CURRENT_TIMESTAMP`, [id, userId]);
        }
        catch (err) {
            throw new Error(`MessageRepository.deleteForUser failed: ${err.message}`);
        }
    }
    async markSeen(id, _userId) {
        try {
            await this.db.execute(`UPDATE messages SET seen = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
            const { rows } = await this.db.query(`SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at FROM messages WHERE id = ?`, [id]);
            return rows[0];
        }
        catch (err) {
            throw new Error(`MessageRepository.markSeen failed: ${err.message}`);
        }
    }
}
exports.MessageRepository = MessageRepository;
