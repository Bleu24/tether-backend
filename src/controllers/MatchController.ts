import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { MatchService } from "../services/MatchService";

export class MatchController extends BaseController {
    constructor(private readonly service: MatchService) {
        super();
    }

    check = this.handler(async (req: Request, res: Response) => {
        const result = await this.service.checkOrCreateForPair(req.body);
        return this.ok(res, result);
    });

    listForUser = this.handler(async (req: Request, res: Response) => {
        const userId = Number(req.params.userId ?? req.query.userId);
        const data = await this.service.listForUser(userId);
        return this.ok(res, data);
    });

    deactivate = this.handler(async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        await this.service.deactivate(id);
        return this.ok(res, { id, is_active: 0 });
    });
}
