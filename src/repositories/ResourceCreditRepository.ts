import { IDatabase } from "../interfaces/IDatabase";

export type ResourceType = "super_like" | "boost";

export class ResourceCreditRepository {
  constructor(private readonly db: IDatabase) {}

  async add(userId: number, type: ResourceType, amount: number, expiresAtIso: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO resource_credits (user_id, type, amount, expires_at) VALUES (?, ?, ?, ?)`,
      [userId, type, amount, expiresAtIso]
    );
  }

  async sumActive(userId: number, type: ResourceType): Promise<number> {
    const { rows } = await this.db.query<any>(
      `SELECT COALESCE(SUM(amount),0) AS total FROM resource_credits WHERE user_id = ? AND type = ? AND expires_at > CURRENT_TIMESTAMP`,
      [userId, type]
    );
    return Number(rows[0]?.total ?? 0);
  }

  async cleanupExpired(): Promise<void> {
    await this.db.execute(`DELETE FROM resource_credits WHERE expires_at <= CURRENT_TIMESTAMP`);
  }
}
