import { IDatabase } from "../interfaces/IDatabase";
import { ProfilePreference } from "../models/ProfilePreference";

export interface IProfilePreferenceRepository {
    getByUserId(userId: number): Promise<ProfilePreference | null>;
    upsert(userId: number, input: Omit<ProfilePreference, "user_id" | "created_at" | "updated_at">): Promise<ProfilePreference>;
}

export class ProfilePreferenceRepository implements IProfilePreferenceRepository {
    constructor(private readonly db: IDatabase) { }

    async getByUserId(userId: number): Promise<ProfilePreference | null> {
        const { rows } = await this.db.query<ProfilePreference & { interests: string }>(
            `SELECT user_id, min_age, max_age, distance, gender_preference, interests, created_at, updated_at
             FROM profile_preferences WHERE user_id = ? LIMIT 1`,
            [userId]
        );
        if (!rows[0]) return null;
        const row = rows[0];
        return { ...row, interests: safeParseJSON(row.interests) } as ProfilePreference;
    }

    async upsert(userId: number, input: Omit<ProfilePreference, "user_id" | "created_at" | "updated_at">): Promise<ProfilePreference> {
        const interests = JSON.stringify(input.interests ?? []);
        await this.db.execute(
            `INSERT INTO profile_preferences (user_id, min_age, max_age, distance, gender_preference, interests)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               min_age = VALUES(min_age),
               max_age = VALUES(max_age),
               distance = VALUES(distance),
               gender_preference = VALUES(gender_preference),
               interests = VALUES(interests)`,
            [userId, input.min_age, input.max_age, input.distance, input.gender_preference, interests]
        );
        const pref = await this.getByUserId(userId);
        // Non-null because we just inserted/updated
        return pref!;
    }
}

function safeParseJSON(value: any): any {
    try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return []; }
}
