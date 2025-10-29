import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { UserService } from "../services/UserService";

export class UserController extends BaseController {
    constructor(private readonly service: UserService) {
        super();
    }

    list = this.handler(async (_req: Request, res: Response) => {
        const users = await this.service.list();
        return this.ok(res, users);
    });

    create = this.handler(async (req: Request, res: Response) => {
        const user = await this.service.create(req.body);
        return this.created(res, user);
    });

    get = this.handler(async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const user = await this.service.getById(id);
        if (!user) return this.fail(res, "User not found", 404);
        return this.ok(res, user);
    });

    update = this.handler(async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const user = await this.service.update(id, req.body);
        return this.ok(res, user);
    });
}
