import { z } from "zod";
import { IProfilePreferenceRepository } from "../repositories/ProfilePreferenceRepository";
import { DatabaseService } from "./DatabaseService";
import { RecommendationRepository } from "../repositories/RecommendationRepository";
import { WebSocketHub } from "../realtime/WebSocketHub";
import { ProfilePreference } from "../models/ProfilePreference";
import { eventBus } from "../events/EventBus";

const PreferenceSchema = z.object({
    min_age: z.number().int().min(18).max(100),
    max_age: z.number().int().min(18).max(100),
    distance: z.number().int().min(1).max(500),
    gender_preference: z.enum(["male", "female", "non-binary", "any"]),
    interests: z.array(z.string()).default([]),
}).refine((v) => v.min_age <= v.max_age, {
    message: "min_age must be <= max_age",
    path: ["min_age"],
});

export class ProfilePreferenceService {
    constructor(private readonly repo: IProfilePreferenceRepository) { }

    async get(userId: number): Promise<ProfilePreference | null> {
        return this.repo.getByUserId(userId);
    }

    async update(userId: number, input: unknown): Promise<ProfilePreference> {
        const pref = PreferenceSchema.parse(input);
        // Capture previous preferences to compute a precise change-set
        const before = await this.repo.getByUserId(userId);
        const updated = await this.repo.upsert(userId, pref);

        // Compute which fields changed
        const changedFields: string[] = (() => {
            if (!before) return ["min_age", "max_age", "distance", "gender_preference", "interests"];
            const out: string[] = [];
            if (before.min_age !== updated.min_age) out.push("min_age");
            if (before.max_age !== updated.max_age) out.push("max_age");
            if (before.distance !== updated.distance) out.push("distance");
            if (before.gender_preference !== updated.gender_preference) out.push("gender_preference");
            // interests: compare as sets
            try {
                const a = new Set<string>(Array.isArray(before.interests) ? before.interests : []);
                const b = new Set<string>(Array.isArray(updated.interests) ? updated.interests : []);
                if (a.size !== b.size) {
                    out.push("interests");
                } else {
                    for (const k of a) { if (!b.has(k)) { out.push("interests"); break; } }
                }
            } catch {
                out.push("interests");
            }
            return out;
        })();

        // Invalidate recommendation queue so the next fetch rebuilds according to new preferences
        try {
            const rec = new RecommendationRepository(DatabaseService.get());
            await rec.clearForUser(userId);
        } catch {}

        // Publish a domain event with the precise change-set
        try {
            eventBus.emit("preferences.updated", {
                userId,
                before: before ?? null,
                after: updated,
                changedFields,
            });
        } catch {}

        // Notify client to refresh discover deck in real time (include changed fields for optional UX)
        try { WebSocketHub.get().sendToUser(userId, "discover:refresh", { changed: changedFields }); } catch {}

        return updated;
    }
}
