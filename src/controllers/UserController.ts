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
}
