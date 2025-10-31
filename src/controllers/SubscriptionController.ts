import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { SubscriptionService } from "../services/SubscriptionService";

export class SubscriptionController extends BaseController {
    constructor(private readonly service: SubscriptionService) {
        super();
    }

    subscribe = this.handler(async (req: Request, res: Response) => {
        const userId = Number(req.params.userId || req.params.id);
        if (!Number.isFinite(userId)) return this.fail(res, "Invalid user id", 400);
        const { plan } = req.body || {};
        const session = await this.service.startCheckout(userId, plan);
        return this.ok(res, { session });
    });

    cancel = this.handler(async (req: Request, res: Response) => {
        const userId = Number(req.params.userId || req.params.id);
        if (!Number.isFinite(userId)) return this.fail(res, "Invalid user id", 400);
        await this.service.cancel(userId);
        return this.ok(res, { status: "ok" });
    });
}
