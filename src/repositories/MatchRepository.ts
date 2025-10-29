import { IDatabase } from "../interfaces/IDatabase";
import { Match } from "../models/Match";

export interface IMatchRepository {
    listForUser(userId: number): Promise<Match[]>;
    findBetween(a: number, b: number): Promise<Match | null>;
    findById(id: number): Promise<Match | null>;
    createIfMutualLike(a: number, b: number): Promise<Match | null>;
    deactivate(id: number): Promise<void>;
}

export class MatchRepository implements IMatchRepository {
    constructor(private readonly db: IDatabase) {}

    async listForUser(userId: number): Promise<Match[]> {
        try {
            const { rows } = await this.db.query<Match>(
                `SELECT id, user_a_id, user_b_id, is_active, created_at
                 FROM matches
                 WHERE (user_a_id = ? OR user_b_id = ?) AND is_active = 1
                 ORDER BY created_at DESC`,
                [userId, userId]
            );
            return rows;
        } catch (err) {
            throw new Error(`MatchRepository.listForUser failed: ${(err as Error).message}`);
        }
    }

    async findBetween(a: number, b: number): Promise<Match | null> {
        try {
            const a1 = Math.min(a, b);
            const b1 = Math.max(a, b);
            const { rows } = await this.db.query<Match>(
                `SELECT id, user_a_id, user_b_id, is_active, created_at
                 FROM matches WHERE user_a_id = ? AND user_b_id = ? LIMIT 1`,
                [a1, b1]
            );
            return rows[0] ?? null;
        } catch (err) {
            throw new Error(`MatchRepository.findBetween failed: ${(err as Error).message}`);
        }
    }

    async findById(id: number): Promise<Match | null> {
        try {
            const { rows } = await this.db.query<Match>(
                `SELECT id, user_a_id, user_b_id, is_active, created_at
                 FROM matches WHERE id = ? LIMIT 1`,
                [id]
            );
            return rows[0] ?? null;
        } catch (err) {
            throw new Error(`MatchRepository.findById failed: ${(err as Error).message}`);
        }
    }

    async createIfMutualLike(a: number, b: number): Promise<Match | null> {
        try {
            if (a === b) return null;
            const a1 = Math.min(a, b);
            const b1 = Math.max(a, b);
            // Check mutual 'like'
            const { rows: likes } = await this.db.query<any>(
                `SELECT COUNT(*) as cnt FROM swipes s1
                 JOIN swipes s2 ON s2.swiper_id = ? AND s2.target_id = ? AND s2.direction = 'like'
                 WHERE s1.swiper_id = ? AND s1.target_id = ? AND s1.direction = 'like'`,
                [b, a, a, b]
            );
            const isMutual = (likes[0]?.cnt ?? 0) > 0;
            if (!isMutual) return null;

            await this.db.execute(
                `INSERT INTO matches (user_a_id, user_b_id, is_active)
                 VALUES (?, ?, 1)
                 ON DUPLICATE KEY UPDATE is_active = 1, created_at = CURRENT_TIMESTAMP`,
                [a1, b1]
            );
            const match = await this.findBetween(a1, b1);
            return match;
        } catch (err) {
            throw new Error(`MatchRepository.createIfMutualLike failed: ${(err as Error).message}`);
        }
    }

    async deactivate(id: number): Promise<void> {
        try {
            await this.db.execute(`UPDATE matches SET is_active = 0 WHERE id = ?`, [id]);
        } catch (err) {
            throw new Error(`MatchRepository.deactivate failed: ${(err as Error).message}`);
        }
    }
}
