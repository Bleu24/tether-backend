import { IDatabase } from "../interfaces/IDatabase";
import { User } from "../models/User";
import type { ProfilePreference } from "../models/ProfilePreference";

export interface IUserRepository {
    findAll(): Promise<User[]>;
    findById(id: number): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(data: (Pick<User, "name" | "email"> & Partial<Omit<User, "id" | "created_at" | "preferences">>) & { password?: string }): Promise<User>;
    updateProfile(id: number, data: Partial<Omit<User, "id" | "email" | "created_at" | "preferences">>): Promise<User>;
    updateLocation(id: number, latitude: number, longitude: number): Promise<User>;
    findNearbyForDiscover(params: {
        userId: number;
        latitude: number;
        longitude: number;
        maxRadiusKm: number;
        genderPreference?: string | null;
        excludeIds: number[];
        limit?: number;
    }): Promise<Array<{ id: number; distance_km: number }>>;
}

export class UserRepository implements IUserRepository {
    constructor(private readonly db: IDatabase) { }

    async findAll(): Promise<User[]> {
        try {
            const { rows } = await this.db.query<any>(
                `SELECT u.id, u.name, u.email, u.created_at, u.birthdate, u.gender, u.location, u.latitude, u.longitude, u.last_seen, u.bio, u.photos, u.subscription_tier, u.setup_complete, u.is_deleted,
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
                `SELECT u.id, u.name, u.email, u.created_at, u.birthdate, u.gender, u.location, u.latitude, u.longitude, u.last_seen, u.bio, u.photos, u.subscription_tier, u.setup_complete, u.is_deleted,
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

    async findByEmail(email: string): Promise<User | null> {
        try {
            const { rows } = await this.db.query<any>(
                `SELECT u.id, u.name, u.email, u.created_at, u.birthdate, u.gender, u.location, u.latitude, u.longitude, u.last_seen, u.bio, u.photos, u.subscription_tier, u.setup_complete, u.is_deleted
                 FROM users u WHERE u.email = ? LIMIT 1`,
                [email]
            );
            const row = rows[0];
            return row ? mapUserRowNoPref(row) : null;
        } catch (err) {
            throw new Error(`UserRepository.findByEmail failed: ${(err as Error).message}`);
        }
    }

    async create(data: (Pick<User, "name" | "email"> & Partial<Omit<User, "id" | "created_at" | "preferences">>) & { password?: string }): Promise<User> {
        try {
            const photos = JSON.stringify(data.photos ?? []);
            const passwordHash = data.password ? require("bcryptjs").hashSync(data.password, 10) : null;
            await this.db.execute(
                `INSERT INTO users (name, email, password_hash, gender, location, bio, photos, subscription_tier)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [data.name, data.email, passwordHash, data.gender ?? null, data.location ?? null, data.bio ?? null, photos, data.subscription_tier ?? "free"]
            );
            const { rows } = await this.db.query<any>(
                `SELECT u.id, u.name, u.email, u.created_at, u.birthdate, u.gender, u.location, u.latitude, u.longitude, u.last_seen, u.bio, u.photos, u.subscription_tier
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
            if (data.birthdate !== undefined) { fields.push("birthdate = ?"); values.push(data.birthdate ?? null); }
            if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
            if (data.gender !== undefined) { fields.push("gender = ?"); values.push(data.gender); }
            if (data.location !== undefined) { fields.push("location = ?"); values.push(data.location); }
            if ((data as any).latitude !== undefined) { fields.push("latitude = ?"); values.push((data as any).latitude); }
            if ((data as any).longitude !== undefined) { fields.push("longitude = ?"); values.push((data as any).longitude); }
            if (data.bio !== undefined) { fields.push("bio = ?"); values.push(data.bio); }
            if (data.photos !== undefined) { fields.push("photos = ?"); values.push(JSON.stringify(data.photos)); }
            if (data.subscription_tier !== undefined) { fields.push("subscription_tier = ?"); values.push(data.subscription_tier); }
            if ((data as any).setup_complete !== undefined) { fields.push("setup_complete = ?"); values.push((data as any).setup_complete ? 1 : 0); }
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

    async updateLocation(id: number, latitude: number, longitude: number): Promise<User> {
        try {
            await this.db.execute(
                `UPDATE users SET latitude = ?, longitude = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?`,
                [latitude, longitude, id]
            );
            const user = await this.findById(id);
            if (!user) throw new Error("User not found");
            return user;
        } catch (err) {
            throw new Error(`UserRepository.updateLocation failed: ${(err as Error).message}`);
        }
    }

    /**
     * Nearby candidates ordered by distance using Haversine, filtered by gender preference and excludeIds.
     * Returns rows: { id, distance_km }
     */
    async findNearbyForDiscover(params: {
        userId: number;
        latitude: number;
        longitude: number;
        maxRadiusKm: number;
        genderPreference?: string | null;
        excludeIds: number[];
        limit?: number;
    }): Promise<Array<{ id: number; distance_km: number }>> {
        const { userId, latitude, longitude, maxRadiusKm, genderPreference, excludeIds, limit = 500 } = params;
        const baseSql = `
          SELECT u.id,
            (6371 * ACOS(
              COS(RADIANS(?)) * COS(RADIANS(u.latitude)) *
              COS(RADIANS(u.longitude) - RADIANS(?)) +
              SIN(RADIANS(?)) * SIN(RADIANS(u.latitude))
            )) AS distance_km
          FROM users u
          WHERE u.id != ?
            AND u.is_deleted = 0
            AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
        `;
        const paramsArr: any[] = [latitude, longitude, latitude, userId];
        let whereExtra = "";
        if (genderPreference && genderPreference !== "any") {
            whereExtra += " AND u.gender = ?";
            paramsArr.push(genderPreference);
        }
        if (excludeIds.length > 0) {
            whereExtra += ` AND u.id NOT IN (${excludeIds.map(() => "?").join(",")})`;
            paramsArr.push(...excludeIds);
        }
        const sql = `${baseSql} ${whereExtra} HAVING distance_km <= ? ORDER BY distance_km ASC LIMIT ${Number(limit)}`;
        paramsArr.push(maxRadiusKm);
        const { rows } = await this.db.query<any>(sql, paramsArr);
        return rows.map((r: any) => ({ id: Number(r.id), distance_km: Number(r.distance_km) }));
    }
}

function computeAge(birthdate?: string | null): number | null {
    if (!birthdate) return null;
    const d = new Date(birthdate);
    if (Number.isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
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
    const birthdate: string | null = row.birthdate ?? null;
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        created_at: row.created_at,
        birthdate,
        age: computeAge(birthdate),
        gender: row.gender ?? null,
        location: row.location ?? null,
        latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
        longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
        last_seen: row.last_seen ?? null,
        bio: row.bio ?? null,
        photos: photos ?? [],
        subscription_tier: row.subscription_tier ?? "free",
        setup_complete: typeof row.setup_complete === 'number' ? row.setup_complete === 1 : !!row.setup_complete,
        is_deleted: typeof row.is_deleted === 'number' ? row.is_deleted === 1 : !!row.is_deleted,
        preferences: pref,
    } as User;
}

function mapUserRowNoPref(row: any): User {
    return mapUserRow({ ...row, pref_user_id: null });
}

function safeParseJSON(value: any): any {
    try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return []; }
}
 

