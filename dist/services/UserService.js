"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const zod_1 = require("zod");
const DatabaseService_1 = require("./DatabaseService");
const SoftDeletedUserRepository_1 = require("../repositories/SoftDeletedUserRepository");
const ProfilePreferenceRepository_1 = require("../repositories/ProfilePreferenceRepository");
const BaseUserDTO = zod_1.z.object({
    name: zod_1.z.string().min(1),
    birthdate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "birthdate must be YYYY-MM-DD" })
        .optional(),
    gender: zod_1.z.enum(["male", "female", "non-binary", "other"]).optional(),
    location: zod_1.z.string().max(200).optional(),
    bio: zod_1.z.string().max(1000).optional(),
    photos: zod_1.z.array(zod_1.z.string().url()).optional(),
    subscription_tier: zod_1.z.enum(["free", "plus", "gold", "premium"]).optional(),
});
const CreateUserDTO = BaseUserDTO.extend({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8, 'password must be at least 8 characters').optional(),
});
const UpdateUserDTO = BaseUserDTO.partial().extend({
    // Allow clients to mark setup completion; persisted as TINYINT(1) by repository
    setup_complete: zod_1.z.boolean().optional(),
});
class UserService {
    constructor(users) {
        this.users = users;
    }
    async list() {
        return this.users.findAll();
    }
    async create(input) {
        const dto = CreateUserDTO.parse(input);
        const { password, ...rest } = dto;
        return this.users.create({ ...rest, password });
    }
    async getById(id) {
        return this.users.findById(id);
    }
    async update(id, input) {
        const dto = UpdateUserDTO.parse(input);
        return this.users.updateProfile(id, dto);
    }
    /**
     * Soft-delete: snapshot user and preferences into soft_deleted_users, then mark user as deleted.
     */
    async softDelete(id) {
        const db = DatabaseService_1.DatabaseService.get();
        const sdu = new SoftDeletedUserRepository_1.SoftDeletedUserRepository(db);
        const prefsRepo = new ProfilePreferenceRepository_1.ProfilePreferenceRepository(db);
        const user = await this.users.findById(id);
        if (!user)
            throw new Error("User not found");
        const prefs = await prefsRepo.getByUserId(id);
        await sdu.insertOrUpdate({
            source_user_id: id,
            email: user.email,
            name: user.name,
            birthdate: user.birthdate ?? null,
            gender: user.gender ?? null,
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
        try {
            await db.execute(`UPDATE users SET photos = JSON_ARRAY() WHERE id = ?`, [id]);
        }
        catch { }
    }
}
exports.UserService = UserService;
