import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { SuperLikeService } from "../services/SuperLikeService";

export class SuperLikeController extends BaseController {
  constructor(private readonly service: SuperLikeService) { super(); }

  canUse = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const result = await this.service.canUseSuperLike(userId);
    return this.ok(res, result);
  });

  create = this.handler(async (req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const receiverId = Number(req.body?.receiverId);
    const result = await this.service.superLike({ senderId: userId, receiverId });
    return this.created(res, result);
  });
}
