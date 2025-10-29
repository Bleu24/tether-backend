import { z } from "zod";
import { IUserRepository } from "../repositories/UserRepository";
import { User } from "../models/User";

const BaseUserDTO = z.object({
    name: z.string().min(1),
    gender: z.enum(["male","female","non-binary","other"]).optional(),
    location: z.string().max(200).optional(),
    bio: z.string().max(1000).optional(),
    photos: z.array(z.string().url()).optional(),
    subscription_tier: z.enum(["free","plus","gold","premium"]).optional(),
});

const CreateUserDTO = BaseUserDTO.extend({
    email: z.string().email(),
});

const UpdateUserDTO = BaseUserDTO.partial();

export class UserService {
    constructor(private readonly users: IUserRepository) { }

    async list(): Promise<User[]> {
        return this.users.findAll();
    }

    async create(input: unknown): Promise<User> {
        const dto = CreateUserDTO.parse(input);
        return this.users.create(dto);
    }

    async getById(id: number): Promise<User | null> {
        return this.users.findById(id);
    }

    async update(id: number, input: unknown): Promise<User> {
        const dto = UpdateUserDTO.parse(input);
        return this.users.updateProfile(id, dto);
    }
}
