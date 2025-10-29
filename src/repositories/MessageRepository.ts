import { IDatabase } from "../interfaces/IDatabase";
import { Message } from "../models/Messages";

export interface IMessageRepository {
    listByMatch(matchId: number, userId?: number, limit?: number): Promise<Message[]>;
    getLatestForMatch(matchId: number, userId?: number): Promise<Message | null>;
    getById(id: number): Promise<Message | null>;
    create(matchId: number, senderId: number, content: string): Promise<Message>;
    updateContent(id: number, senderId: number, content: string): Promise<Message>;
    deleteForEveryone(id: number, requesterId: number): Promise<void>;
    deleteForUser(id: number, userId: number): Promise<void>;
    markSeen(id: number, userId: number): Promise<Message>;
}

export class MessageRepository implements IMessageRepository {
    constructor(private readonly db: IDatabase) {}

    async listByMatch(matchId: number, userId?: number, limit = 200): Promise<Message[]> {
        try {
            if (userId) {
                const { rows } = await this.db.query<Message>(
                    `SELECT m.id, m.match_id, m.sender_id, m.content, m.is_deleted, m.seen, m.created_at, m.updated_at
                     FROM messages m
                     LEFT JOIN message_deletions md ON md.message_id = m.id AND md.user_id = ?
                     WHERE m.match_id = ? AND md.message_id IS NULL
                     ORDER BY m.created_at ASC LIMIT ?`,
                    [userId, matchId, limit]
                );
                return rows;
            }
            const { rows } = await this.db.query<Message>(
                `SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at
                 FROM messages WHERE match_id = ? ORDER BY created_at ASC LIMIT ?`,
                [matchId, limit]
            );
            return rows;
        } catch (err) {
            throw new Error(`MessageRepository.listByMatch failed: ${(err as Error).message}`);
        }
    }

    async getLatestForMatch(matchId: number, userId?: number): Promise<Message | null> {
        try {
            if (userId) {
                const { rows } = await this.db.query<Message>(
                    `SELECT m.id, m.match_id, m.sender_id, m.content, m.is_deleted, m.seen, m.created_at, m.updated_at
                     FROM messages m
                     LEFT JOIN message_deletions md ON md.message_id = m.id AND md.user_id = ?
                     WHERE m.match_id = ? AND md.message_id IS NULL
                     ORDER BY m.created_at DESC LIMIT 1`,
                    [userId, matchId]
                );
                return rows[0] ?? null;
            }
            const { rows } = await this.db.query<Message>(
                `SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at
                 FROM messages WHERE match_id = ? ORDER BY created_at DESC LIMIT 1`,
                [matchId]
            );
            return rows[0] ?? null;
        } catch (err) {
            throw new Error(`MessageRepository.getLatestForMatch failed: ${(err as Error).message}`);
        }
    }

    async create(matchId: number, senderId: number, content: string): Promise<Message> {
        try {
            await this.db.execute(
                `INSERT INTO messages (match_id, sender_id, content) VALUES (?, ?, ?)`,
                [matchId, senderId, content]
            );
            const { rows } = await this.db.query<Message>(
                `SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at
                 FROM messages WHERE match_id = ? AND sender_id = ? ORDER BY id DESC LIMIT 1`,
                [matchId, senderId]
            );
            return rows[0];
        } catch (err) {
            throw new Error(`MessageRepository.create failed: ${(err as Error).message}`);
        }
    }

    async getById(id: number): Promise<Message | null> {
        try {
            const { rows } = await this.db.query<Message>(
                `SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at FROM messages WHERE id = ? LIMIT 1`,
                [id]
            );
            return rows[0] ?? null;
        } catch (err) {
            throw new Error(`MessageRepository.getById failed: ${(err as Error).message}`);
        }
    }

    async updateContent(id: number, senderId: number, content: string): Promise<Message> {
        try {
            await this.db.execute(`UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ? AND is_deleted = 0`, [content, id, senderId]);
            const { rows } = await this.db.query<Message>(`SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at FROM messages WHERE id = ?`, [id]);
            return rows[0];
        } catch (err) {
            throw new Error(`MessageRepository.updateContent failed: ${(err as Error).message}`);
        }
    }

    async deleteForEveryone(id: number, requesterId: number): Promise<void> {
        try {
            await this.db.execute(`UPDATE messages SET is_deleted = 1, content = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND sender_id = ?`, [id, requesterId]);
        } catch (err) {
            throw new Error(`MessageRepository.deleteForEveryone failed: ${(err as Error).message}`);
        }
    }

    async deleteForUser(id: number, userId: number): Promise<void> {
        try {
            await this.db.execute(`INSERT INTO message_deletions (message_id, user_id, deleted_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                                   ON DUPLICATE KEY UPDATE deleted_at = CURRENT_TIMESTAMP`, [id, userId]);
        } catch (err) {
            throw new Error(`MessageRepository.deleteForUser failed: ${(err as Error).message}`);
        }
    }

    async markSeen(id: number, _userId: number): Promise<Message> {
        try {
            await this.db.execute(`UPDATE messages SET seen = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
            const { rows } = await this.db.query<Message>(`SELECT id, match_id, sender_id, content, is_deleted, seen, created_at, updated_at FROM messages WHERE id = ?`, [id]);
            return rows[0];
        } catch (err) {
            throw new Error(`MessageRepository.markSeen failed: ${(err as Error).message}`);
        }
    }
}
