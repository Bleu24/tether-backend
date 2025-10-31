"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilePreferenceService = void 0;
const zod_1 = require("zod");
const DatabaseService_1 = require("./DatabaseService");
const RecommendationRepository_1 = require("../repositories/RecommendationRepository");
const WebSocketHub_1 = require("../realtime/WebSocketHub");
const EventBus_1 = require("../events/EventBus");
const PreferenceSchema = zod_1.z.object({
    min_age: zod_1.z.number().int().min(18).max(100),
    max_age: zod_1.z.number().int().min(18).max(100),
    distance: zod_1.z.number().int().min(1).max(500),
    gender_preference: zod_1.z.enum(["male", "female", "non-binary", "any"]),
    interests: zod_1.z.array(zod_1.z.string()).default([]),
}).refine((v) => v.min_age <= v.max_age, {
    message: "min_age must be <= max_age",
    path: ["min_age"],
});
class ProfilePreferenceService {
    constructor(repo) {
        this.repo = repo;
    }
    async get(userId) {
        return this.repo.getByUserId(userId);
    }
    async update(userId, input) {
        const pref = PreferenceSchema.parse(input);
        // Capture previous preferences to compute a precise change-set
        const before = await this.repo.getByUserId(userId);
        const updated = await this.repo.upsert(userId, pref);
        // Compute which fields changed
        const changedFields = (() => {
            if (!before)
                return ["min_age", "max_age", "distance", "gender_preference", "interests"];
            const out = [];
            if (before.min_age !== updated.min_age)
                out.push("min_age");
            if (before.max_age !== updated.max_age)
                out.push("max_age");
            if (before.distance !== updated.distance)
                out.push("distance");
            if (before.gender_preference !== updated.gender_preference)
                out.push("gender_preference");
            // interests: compare as sets
            try {
                const a = new Set(Array.isArray(before.interests) ? before.interests : []);
                const b = new Set(Array.isArray(updated.interests) ? updated.interests : []);
                if (a.size !== b.size) {
                    out.push("interests");
                }
                else {
                    for (const k of a) {
                        if (!b.has(k)) {
                            out.push("interests");
                            break;
                        }
                    }
                }
            }
            catch {
                out.push("interests");
            }
            return out;
        })();
        // Invalidate recommendation queue so the next fetch rebuilds according to new preferences
        try {
            const rec = new RecommendationRepository_1.RecommendationRepository(DatabaseService_1.DatabaseService.get());
            await rec.clearForUser(userId);
        }
        catch { }
        // Publish a domain event with the precise change-set
        try {
            EventBus_1.eventBus.emit("preferences.updated", {
                userId,
                before: before ?? null,
                after: updated,
                changedFields,
            });
        }
        catch { }
        // Notify client to refresh discover deck in real time (include changed fields for optional UX)
        try {
            WebSocketHub_1.WebSocketHub.get().sendToUser(userId, "discover:refresh", { changed: changedFields });
        }
        catch { }
        return updated;
    }
}
exports.ProfilePreferenceService = ProfilePreferenceService;
