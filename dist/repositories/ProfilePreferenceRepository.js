"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilePreferenceRepository = void 0;
class ProfilePreferenceRepository {
    constructor(db) {
        this.db = db;
    }
    async getByUserId(userId) {
        const { rows } = await this.db.query(`SELECT user_id, min_age, max_age, distance, gender_preference, interests, created_at, updated_at
             FROM profile_preferences WHERE user_id = ? LIMIT 1`, [userId]);
        if (!rows[0])
            return null;
        const row = rows[0];
        return { ...row, interests: safeParseJSON(row.interests) };
    }
    async upsert(userId, input) {
        const interests = JSON.stringify(input.interests ?? []);
        await this.db.execute(`INSERT INTO profile_preferences (user_id, min_age, max_age, distance, gender_preference, interests)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               min_age = VALUES(min_age),
               max_age = VALUES(max_age),
               distance = VALUES(distance),
               gender_preference = VALUES(gender_preference),
               interests = VALUES(interests)`, [userId, input.min_age, input.max_age, input.distance, input.gender_preference, interests]);
        const pref = await this.getByUserId(userId);
        // Non-null because we just inserted/updated
        return pref;
    }
}
exports.ProfilePreferenceRepository = ProfilePreferenceRepository;
function safeParseJSON(value) {
    try {
        return typeof value === "string" ? JSON.parse(value) : value;
    }
    catch {
        return [];
    }
}
