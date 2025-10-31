import { IDatabase } from "../interfaces/IDatabase";
import { Boost } from "../models/Boost";

export class BoostRepository {
  constructor(private readonly db: IDatabase) {}

  async activate(userId: number, minutes = 30): Promise<Boost> {
    await this.db.execute(
      `INSERT INTO boosts (user_id, start_time, end_time, is_active)
       VALUES (?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), 1)`,
      [userId, minutes]
    );
    const { rows } = await this.db.query<Boost>(
      `SELECT * FROM boosts WHERE user_id = ? ORDER BY start_time DESC LIMIT 1`,
      [userId]
    );
    return rows[0] as Boost;
  }

  async deactivateExpired(): Promise<void> {
    await this.db.execute(`UPDATE boosts SET is_active = 0 WHERE is_active = 1 AND end_time < CURRENT_TIMESTAMP`);
  }

  async hasActive(userId: number): Promise<boolean> {
    const { rows } = await this.db.query<any>(
      `SELECT 1 FROM boosts WHERE user_id = ? AND is_active = 1 AND start_time <= CURRENT_TIMESTAMP AND end_time >= CURRENT_TIMESTAMP LIMIT 1`,
      [userId]
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  async lastActivation(userId: number): Promise<Boost | null> {
    const { rows } = await this.db.query<Boost>(
      `SELECT * FROM boosts WHERE user_id = ? ORDER BY start_time DESC LIMIT 1`,
      [userId]
    );
    return (rows[0] as Boost) ?? null;
  }

  async countSince(userId: number, sinceIso: string): Promise<number> {
    const { rows } = await this.db.query<any>(
      `SELECT COUNT(*) AS c FROM boosts WHERE user_id = ? AND start_time >= ?`,
      [userId, sinceIso]
    );
    return Number(rows[0]?.c ?? 0);
  }

  async listActiveIds(candidates?: number[]): Promise<number[]> {
    if (candidates && candidates.length > 0) {
      const placeholders = candidates.map(() => '?').join(',');
      const { rows } = await this.db.query<any>(
        `SELECT DISTINCT user_id FROM boosts WHERE is_active = 1 AND start_time <= CURRENT_TIMESTAMP AND end_time >= CURRENT_TIMESTAMP AND user_id IN (${placeholders})`,
        candidates
      );
      return rows.map((r: any) => Number(r.user_id));
    }
    const { rows } = await this.db.query<any>(
      `SELECT DISTINCT user_id FROM boosts WHERE is_active = 1 AND start_time <= CURRENT_TIMESTAMP AND end_time >= CURRENT_TIMESTAMP`
    );
    return rows.map((r: any) => Number(r.user_id));
  }
}
