import { z } from "zod";
import { IUserRepository } from "../repositories/UserRepository";
import { User } from "../models/User";

const CreateUserDTO = z.object({
    name: z.string().min(1),
    email: z.string().email(),
});

export class UserService {
    constructor(private readonly users: IUserRepository) { }

    async list(): Promise<User[]> {
        return this.users.findAll();
    }

    async create(input: unknown): Promise<User> {
        const dto = CreateUserDTO.parse(input);
        return this.users.create(dto);
    }
}
