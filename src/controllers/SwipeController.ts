import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { SwipeService } from "../services/SwipeService";

export class SwipeController extends BaseController {
    constructor(private readonly service: SwipeService) {
        super();
    }

    create = this.handler(async (req: Request, res: Response) => {
        const swipe = await this.service.record(req.body);
        return this.created(res, swipe);
    });

    listBySwiper = this.handler(async (req: Request, res: Response) => {
        const userId = Number(req.params.userId ?? req.query.swiperId);
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const swipes = await this.service.listBySwiper(userId, limit);
        return this.ok(res, swipes);
    });
}
