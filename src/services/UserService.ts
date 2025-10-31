import { z } from "zod";
import { IUserRepository } from "../repositories/UserRepository";
import { User } from "../models/User";
import { DatabaseService } from "./DatabaseService";
import { SoftDeletedUserRepository } from "../repositories/SoftDeletedUserRepository";
import { ProfilePreferenceRepository } from "../repositories/ProfilePreferenceRepository";

const BaseUserDTO = z.object({
    name: z.string().min(1),
    birthdate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/,{ message: "birthdate must be YYYY-MM-DD" })
        .optional(),
    gender: z.enum(["male","female","non-binary","other"]).optional(),
    location: z.string().max(200).optional(),
    bio: z.string().max(1000).optional(),
    photos: z.array(z.string().url()).optional(),
    subscription_tier: z.enum(["free","plus","gold","premium"]).optional(),
});

const CreateUserDTO = BaseUserDTO.extend({
    email: z.string().email(),
    password: z.string().min(8, 'password must be at least 8 characters').optional(),
});

const UpdateUserDTO = BaseUserDTO.partial().extend({
    // Allow clients to mark setup completion; persisted as TINYINT(1) by repository
    setup_complete: z.boolean().optional(),
});

export class UserService {
    constructor(private readonly users: IUserRepository) { }

    async list(): Promise<User[]> {
        return this.users.findAll();
    }

    async create(input: unknown): Promise<User> {
        const dto = CreateUserDTO.parse(input);
        const { password, ...rest } = dto as any;
        return this.users.create({ ...(rest as any), password });
    }

    async getById(id: number): Promise<User | null> {
        return this.users.findById(id);
    }

    async update(id: number, input: unknown): Promise<User> {
        const dto = UpdateUserDTO.parse(input);
        return this.users.updateProfile(id, dto);
    }

    /**
     * Soft-delete: snapshot user and preferences into soft_deleted_users, then mark user as deleted.
     */
    async softDelete(id: number): Promise<void> {
        const db = DatabaseService.get();
        const sdu = new SoftDeletedUserRepository(db);
        const prefsRepo = new ProfilePreferenceRepository(db);
        const user = await this.users.findById(id);
        if (!user) throw new Error("User not found");
        const prefs = await prefsRepo.getByUserId(id);
        await sdu.insertOrUpdate({
            source_user_id: id,
            email: user.email,
            name: user.name,
            birthdate: user.birthdate ?? null,
            gender: (user.gender as any) ?? null,
            location: user.location ?? null,
            bio: user.bio ?? null,
            photos: user.photos ?? [],
            preferences: prefs ? {
                min_age: prefs.min_age,
                max_age: prefs.max_age,
                distance: prefs.distance,
                gender_preference: prefs.gender_preference,
                interests: prefs.interests,
            } : null,
            subscription_tier: user.subscription_tier ?? null,
        });
        // Mark user as deleted and optionally anonymize
        await db.execute(`UPDATE users SET is_deleted = 1, name = 'Deleted User' WHERE id = ?`, [id]);
        // Optionally clear photos for privacy
        try { await db.execute(`UPDATE users SET photos = JSON_ARRAY() WHERE id = ?`, [id]); } catch {}
    }
}
