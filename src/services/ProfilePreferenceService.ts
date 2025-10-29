import { z } from "zod";
import { IProfilePreferenceRepository } from "../repositories/ProfilePreferenceRepository";
import { ProfilePreference } from "../models/ProfilePreference";

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
        return this.repo.upsert(userId, pref);
    }
}
