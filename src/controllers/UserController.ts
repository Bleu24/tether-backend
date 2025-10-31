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

    delete = this.handler(async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const requester = (res.locals as any)?.userId as number | undefined;
        if (!requester || requester !== id) {
            return this.fail(res, "Forbidden", 403);
        }
        await this.service.softDelete(id);
        // Optional: clear auth for the deleter if deleting self; enforcement can be in route middleware
        try {
            // static import to satisfy NodeNext module resolution
            const { clearAuthCookie } = require("../middleware/jwt");
            if (typeof clearAuthCookie === "function") clearAuthCookie(res);
        } catch {}
        return this.ok(res, { id, deleted: true });
    });
}
