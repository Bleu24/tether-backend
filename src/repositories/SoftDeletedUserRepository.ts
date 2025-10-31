import { IDatabase } from "../interfaces/IDatabase";

export type SoftDeletedUser = {
  id?: number;
  source_user_id?: number | null;
  email: string;
  name?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  location?: string | null;
  bio?: string | null;
  photos?: any;
  preferences?: any;
  subscription_tier?: string | null;
  deleted_at?: string;
};

export class SoftDeletedUserRepository {
  constructor(private readonly db: IDatabase) {}

  async insertOrUpdate(data: SoftDeletedUser): Promise<void> {
    await this.db.execute(
      `INSERT INTO soft_deleted_users (source_user_id, email, name, birthdate, gender, location, bio, photos, preferences, subscription_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.source_user_id ?? null,
        data.email,
        data.name ?? null,
        data.birthdate ?? null,
        data.gender ?? null,
        data.location ?? null,
        data.bio ?? null,
        JSON.stringify(data.photos ?? []),
        JSON.stringify(data.preferences ?? null),
        data.subscription_tier ?? null,
      ]
    );
  }

  async findLatestByEmail(email: string): Promise<SoftDeletedUser | null> {
    const { rows } = await this.db.query<any>(
      `SELECT * FROM soft_deleted_users WHERE email = ? ORDER BY deleted_at DESC LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  }
}
