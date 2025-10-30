import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { ProfilePreferenceService } from "../services/ProfilePreferenceService";

export class ProfilePreferenceController extends BaseController {
    constructor(private readonly service: ProfilePreferenceService) {
        super();
    }

    get = this.handler(async (req: Request, res: Response) => {
        const userId = Number(req.params.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
            return this.fail(res, "Invalid user id", 400);
        }
        const pref = await this.service.get(userId);
        return this.ok(res, pref);
    });

    update = this.handler(async (req: Request, res: Response) => {
        const userId = Number(req.params.userId);
        if (!Number.isFinite(userId) || userId <= 0) {
            return this.fail(res, "Invalid user id", 400);
        }
        const pref = await this.service.update(userId, req.body);
        return this.ok(res, pref);
    });
}
