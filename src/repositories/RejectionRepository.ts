import { IDatabase } from "../interfaces/IDatabase";
import { Rejection } from "../models/Rejection";

export interface IRejectionRepository {
  add(swiperId: number, targetId: number): Promise<void>;
  undo(swiperId: number, targetId: number): Promise<{ affected: number }>;
  listActiveRejectedIds(swiperId: number): Promise<number[]>;
}

export class RejectionRepository implements IRejectionRepository {
  constructor(private readonly db: IDatabase) {}

  async add(swiperId: number, targetId: number): Promise<void> {
    await this.db.execute(
      `INSERT INTO rejections (swiper_id, target_id, created_at, undone_at)
       VALUES (?, ?, CURRENT_TIMESTAMP, NULL)
       ON DUPLICATE KEY UPDATE undone_at = NULL, created_at = CURRENT_TIMESTAMP`,
      [swiperId, targetId]
    );
  }

  async undo(swiperId: number, targetId: number): Promise<{ affected: number }> {
    // Semantics: fully clear the rejection entry on undo
    const result = await this.db.execute(
      `DELETE FROM rejections WHERE swiper_id = ? AND target_id = ?`,
      [swiperId, targetId]
    );
    const affected = (result as any)?.[0]?.affectedRows ?? 0;
    return { affected };
  }

  async listActiveRejectedIds(swiperId: number): Promise<number[]> {
    const { rows } = await this.db.query<Pick<Rejection, "target_id">>(
      `SELECT target_id FROM rejections WHERE swiper_id = ? AND undone_at IS NULL`,
      [swiperId]
    );
    return rows.map((r: any) => Number(r.target_id));
  }
}
