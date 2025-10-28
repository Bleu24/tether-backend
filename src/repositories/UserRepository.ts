import { IDatabase } from "../interfaces/IDatabase";
import { User } from "../models/User";

export interface IUserRepository {
    findAll(): Promise<User[]>;
    create(data: Pick<User, "name" | "email">): Promise<User>;
}

export class UserRepository implements IUserRepository {
    constructor(private readonly db: IDatabase) { }

    async findAll(): Promise<User[]> {
        const { rows } = await this.db.query<User>(
            "SELECT id, name, email, created_at FROM users ORDER BY id DESC"
        );
        return rows;
    }

    async create(data: Pick<User, "name" | "email">): Promise<User> {
        await this.db.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            [data.name, data.email]
        );
        const { rows } = await this.db.query<User>(
            "SELECT id, name, email, created_at FROM users WHERE email = ? LIMIT 1",
            [data.email]
        );
        return rows[0];
    }
}
