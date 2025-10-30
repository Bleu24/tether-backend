import { IDatabase } from "../interfaces/IDatabase";
import { Recommendation } from "../models/Recommendation";

export class RecommendationRepository {
  constructor(private readonly db: IDatabase) {}

  async getQueuedTargets(userId: number, limit = 50): Promise<number[]> {
    const { rows } = await this.db.query<Pick<Recommendation, 'target_id'>>(
      `SELECT target_id FROM recommendation_queue WHERE user_id = ? AND status = 'queued' ORDER BY created_at ASC LIMIT ?`,
      [userId, limit]
    );
    return rows.map((r: any) => Number(r.target_id));
  }

  async ensureQueued(userId: number, targetIds: number[]): Promise<void> {
    if (targetIds.length === 0) return;
    const values = targetIds.map(() => '(?,?,"queued", CURRENT_TIMESTAMP, NULL)').join(',');
    const params: any[] = [];
    for (const t of targetIds) { params.push(userId, t); }
    await this.db.execute(
      `INSERT INTO recommendation_queue (user_id, target_id, status, created_at, consumed_at)
       VALUES ${values}
       ON DUPLICATE KEY UPDATE status = VALUES(status), created_at = IF(status='queued', created_at, VALUES(created_at)), consumed_at = NULL`,
      params
    );
  }

  async markConsumed(userId: number, targetId: number): Promise<void> {
    await this.db.execute(
      `UPDATE recommendation_queue SET status = 'consumed', consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND target_id = ?`,
      [userId, targetId]
    );
  }
}
