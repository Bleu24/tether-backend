import { IDatabase } from "../interfaces/IDatabase";
import { Match } from "../models/Match";

export interface IMatchRepository {
    listForUser(userId: number): Promise<Match[]>;
    findBetween(a: number, b: number): Promise<Match | null>;
    findById(id: number): Promise<Match | null>;
    createIfMutualLike(a: number, b: number): Promise<Match | null>;
    deactivate(id: number): Promise<void>;
    /**
     * For a given user, find all reciprocal 'like' pairs that do not yet have a row in matches,
     * create those match rows, and return the newly created matches (for both directions that include the user).
     */
    createMissingForUser(userId: number): Promise<Match[]>;
    /**
     * List matches for which the given user hasn't seen the celebration animation yet.
     */
    listPendingCelebrations(userId: number): Promise<Match[]>;
    /**
     * Mark the celebration as shown for the given user on the given match.
     */
    markCelebrationShown(matchId: number, userId: number): Promise<void>;
}

export class MatchRepository implements IMatchRepository {
    constructor(private readonly db: IDatabase) {}

    async listForUser(userId: number): Promise<Match[]> {
        try {
            const { rows } = await this.db.query<Match>(
                `SELECT id, user_a_id, user_b_id, is_active, created_at,
                        celebration_shown_to_a, celebration_shown_to_b
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
                `SELECT id, user_a_id, user_b_id, is_active, created_at,
                        celebration_shown_to_a, celebration_shown_to_b
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
                `SELECT id, user_a_id, user_b_id, is_active, created_at,
                        celebration_shown_to_a, celebration_shown_to_b
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

    async createMissingForUser(userId: number): Promise<Match[]> {
        try {
            // Find all mutual likes involving the user that don't have a match row yet
            const { rows: pairs } = await this.db.query<{ a: number; b: number }>(
                `SELECT DISTINCT pairs.a, pairs.b
                 FROM (
                   SELECT LEAST(s1.swiper_id, s1.target_id) AS a,
                          GREATEST(s1.swiper_id, s1.target_id) AS b
                   FROM swipes s1
                   JOIN swipes s2
                     ON s1.swiper_id = s2.target_id
                    AND s1.target_id = s2.swiper_id
                   WHERE s1.direction = 'like' AND s2.direction = 'like'
                     AND (s1.swiper_id = ? OR s1.target_id = ?)
                 ) pairs
                 LEFT JOIN matches m
                   ON m.user_a_id = pairs.a AND m.user_b_id = pairs.b
                 WHERE m.id IS NULL`,
                [userId, userId]
            );

            if (!pairs || pairs.length === 0) return [];

            // Insert missing matches
            for (const p of pairs) {
                await this.db.execute(
                    `INSERT INTO matches (user_a_id, user_b_id, is_active)
                     VALUES (?, ?, 1)
                     ON DUPLICATE KEY UPDATE is_active = 1, created_at = CURRENT_TIMESTAMP`,
                    [p.a, p.b]
                );
            }

            // Fetch and return the created matches for those pairs
            const createdIdsParams: number[] = [];
            const whereClauses: string[] = [];
            for (const p of pairs) {
                whereClauses.push(`(user_a_id = ? AND user_b_id = ?)`);
                createdIdsParams.push(p.a, p.b);
            }
            const sql = `SELECT id, user_a_id, user_b_id, is_active, created_at,
                                celebration_shown_to_a, celebration_shown_to_b
                         FROM matches
                         WHERE ${whereClauses.join(" OR ")}`;
            const { rows: created } = await this.db.query<Match>(sql, createdIdsParams);
            // Only return those that involve the requested user (defensive, though query already scopes it)
            return created.filter(m => m.user_a_id === userId || m.user_b_id === userId);
        } catch (err) {
            throw new Error(`MatchRepository.createMissingForUser failed: ${(err as Error).message}`);
        }
    }

    async listPendingCelebrations(userId: number): Promise<Match[]> {
        try {
            const { rows } = await this.db.query<Match>(
                `SELECT id, user_a_id, user_b_id, is_active, created_at,
                        celebration_shown_to_a, celebration_shown_to_b
                 FROM matches
                 WHERE is_active = 1 AND (
                      (user_a_id = ? AND celebration_shown_to_a = 0)
                   OR (user_b_id = ? AND celebration_shown_to_b = 0)
                 )
                 ORDER BY created_at ASC`,
                [userId, userId]
            );
            return rows;
        } catch (err) {
            throw new Error(`MatchRepository.listPendingCelebrations failed: ${(err as Error).message}`);
        }
    }

    async markCelebrationShown(matchId: number, userId: number): Promise<void> {
        try {
            await this.db.execute(
                `UPDATE matches
                 SET celebration_shown_to_a = CASE WHEN user_a_id = ? THEN 1 ELSE celebration_shown_to_a END,
                     celebration_shown_to_b = CASE WHEN user_b_id = ? THEN 1 ELSE celebration_shown_to_b END
                 WHERE id = ? AND (user_a_id = ? OR user_b_id = ?)`,
                [userId, userId, matchId, userId, userId]
            );
        } catch (err) {
            throw new Error(`MatchRepository.markCelebrationShown failed: ${(err as Error).message}`);
        }
    }
}
