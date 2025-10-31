"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftDeletedUserRepository = void 0;
class SoftDeletedUserRepository {
    constructor(db) {
        this.db = db;
    }
    async insertOrUpdate(data) {
        await this.db.execute(`INSERT INTO soft_deleted_users (source_user_id, email, name, birthdate, gender, location, bio, photos, preferences, subscription_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
        ]);
    }
    async findLatestByEmail(email) {
        const { rows } = await this.db.query(`SELECT * FROM soft_deleted_users WHERE email = ? ORDER BY deleted_at DESC LIMIT 1`, [email]);
        return rows[0] || null;
    }
}
exports.SoftDeletedUserRepository = SoftDeletedUserRepository;
