import { IDatabase } from "../interfaces/IDatabase";
import { SuperLike } from "../models/SuperLike";

export class SuperLikeRepository {
  constructor(private readonly db: IDatabase) {}

  async create(senderId: number, receiverId: number): Promise<SuperLike> {
    await this.db.execute(
      `INSERT INTO super_likes (sender_id, receiver_id) VALUES (?, ?)`,
      [senderId, receiverId]
    );
    const { rows } = await this.db.query<SuperLike>(
      `SELECT * FROM super_likes WHERE sender_id = ? AND receiver_id = ? ORDER BY created_at DESC LIMIT 1`,
      [senderId, receiverId]
    );
    return rows[0] as SuperLike;
  }

  async countSince(senderId: number, sinceIso: string): Promise<number> {
    const { rows } = await this.db.query<any>(
      `SELECT COUNT(*) AS c FROM super_likes WHERE sender_id = ? AND created_at >= ?`,
      [senderId, sinceIso]
    );
    return Number(rows[0]?.c ?? 0);
  }

  async hasSent(senderId: number, receiverId: number): Promise<boolean> {
    const { rows } = await this.db.query<any>(
      `SELECT 1 FROM super_likes WHERE sender_id = ? AND receiver_id = ? LIMIT 1`,
      [senderId, receiverId]
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  async listSendersTo(userId: number, limit = 100): Promise<number[]> {
    const { rows } = await this.db.query<any>(
      `SELECT sender_id FROM super_likes WHERE receiver_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows.map((r: any) => Number(r.sender_id));
  }
}
