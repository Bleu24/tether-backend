import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { RejectionService } from "../services/RejectionService";

export class RejectionController extends BaseController {
  constructor(private readonly service: RejectionService) {
    super();
  }

  undo = this.handler(async (req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const targetId = Number(req.body?.targetId);
    if (!targetId || isNaN(targetId)) return this.fail(res, "Invalid targetId", 400);
    const result = await this.service.undo(userId, targetId);
    if (!result.success) return this.fail(res, result.reason || "Unable to undo", result.reason === "Subscription required" ? 402 : 400);
    return this.ok(res, { undone: true });
  });
}
