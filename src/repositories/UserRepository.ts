import { IDatabase } from "../interfaces/IDatabase";
import { User } from "../models/User";
import type { ProfilePreference } from "../models/ProfilePreference";

export interface IUserRepository {
    findAll(): Promise<User[]>;
    findById(id: number): Promise<User | null>;
    create(data: Pick<User, "name" | "email"> & Partial<Omit<User, "id" | "created_at" | "preferences">>): Promise<User>;
    updateProfile(id: number, data: Partial<Omit<User, "id" | "email" | "created_at" | "preferences">>): Promise<User>;
}

export class UserRepository implements IUserRepository {
    constructor(private readonly db: IDatabase) { }

    async findAll(): Promise<User[]> {
        try {
            const { rows } = await this.db.query<any>(
                `SELECT u.id, u.name, u.email, u.created_at, u.gender, u.location, u.bio, u.photos, u.subscription_tier,
                        pp.user_id as pref_user_id, pp.min_age, pp.max_age, pp.distance, pp.gender_preference, pp.interests, pp.created_at as pref_created_at, pp.updated_at as pref_updated_at
                 FROM users u
                 LEFT JOIN profile_preferences pp ON pp.user_id = u.id
                 ORDER BY u.id DESC`
            );
            return rows.map(mapUserRow);
        } catch (err) {
            throw new Error(`UserRepository.findAll failed: ${(err as Error).message}`);
        }
    }

    async findById(id: number): Promise<User | null> {
        try {
            const { rows } = await this.db.query<any>(
                `SELECT u.id, u.name, u.email, u.created_at, u.gender, u.location, u.bio, u.photos, u.subscription_tier,
                        pp.user_id as pref_user_id, pp.min_age, pp.max_age, pp.distance, pp.gender_preference, pp.interests, pp.created_at as pref_created_at, pp.updated_at as pref_updated_at
                 FROM users u
                 LEFT JOIN profile_preferences pp ON pp.user_id = u.id
                 WHERE u.id = ?
                 LIMIT 1`,
                [id]
            );
            const row = rows[0];
            return row ? mapUserRow(row) : null;
        } catch (err) {
            throw new Error(`UserRepository.findById failed: ${(err as Error).message}`);
        }
    }

    async create(data: Pick<User, "name" | "email"> & Partial<Omit<User, "id" | "created_at" | "preferences">>): Promise<User> {
        try {
            const photos = JSON.stringify(data.photos ?? []);
            await this.db.execute(
                `INSERT INTO users (name, email, gender, location, bio, photos, subscription_tier)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [data.name, data.email, data.gender ?? null, data.location ?? null, data.bio ?? null, photos, data.subscription_tier ?? "free"]
            );
            const { rows } = await this.db.query<any>(
                `SELECT u.id, u.name, u.email, u.created_at, u.gender, u.location, u.bio, u.photos, u.subscription_tier
                 FROM users u WHERE u.email = ? LIMIT 1`,
                [data.email]
            );
            return rows.map(mapUserRowNoPref)[0];
        } catch (err) {
            throw new Error(`UserRepository.create failed: ${(err as Error).message}`);
        }
    }

    async updateProfile(id: number, data: Partial<Omit<User, "id" | "email" | "created_at" | "preferences">>): Promise<User> {
        try {
            // Build dynamic set clause for provided fields
            const fields: string[] = [];
            const values: any[] = [];
            if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
            if (data.gender !== undefined) { fields.push("gender = ?"); values.push(data.gender); }
            if (data.location !== undefined) { fields.push("location = ?"); values.push(data.location); }
            if (data.bio !== undefined) { fields.push("bio = ?"); values.push(data.bio); }
            if (data.photos !== undefined) { fields.push("photos = ?"); values.push(JSON.stringify(data.photos)); }
            if (data.subscription_tier !== undefined) { fields.push("subscription_tier = ?"); values.push(data.subscription_tier); }
            if (fields.length) {
                await this.db.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
            }
            const user = await this.findById(id);
            if (!user) throw new Error("User not found");
            return user;
        } catch (err) {
            throw new Error(`UserRepository.updateProfile failed: ${(err as Error).message}`);
        }
    }
}

function mapUserRow(row: any): User {
    const photos = safeParseJSON(row.photos);
    const pref: ProfilePreference | null = row.pref_user_id ? {
        user_id: row.pref_user_id,
        min_age: row.min_age,
        max_age: row.max_age,
        distance: row.distance,
        gender_preference: row.gender_preference,
        interests: safeParseJSON(row.interests) ?? [],
        created_at: row.pref_created_at,
        updated_at: row.pref_updated_at,
    } : null;
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        created_at: row.created_at,
        gender: row.gender ?? null,
        location: row.location ?? null,
        bio: row.bio ?? null,
        photos: photos ?? [],
        subscription_tier: row.subscription_tier ?? "free",
        preferences: pref,
    } as User;
}

function mapUserRowNoPref(row: any): User {
    return mapUserRow({ ...row, pref_user_id: null });
}

function safeParseJSON(value: any): any {
    try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return []; }
}
