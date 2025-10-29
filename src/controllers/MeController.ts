import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { MeService } from "../services/MeService";

export class MeController extends BaseController {
  constructor(private readonly service: MeService) {
    super();
  }

  profile = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const me = await this.service.getProfile(userId);
    if (!me) return this.fail(res, "User not found", 404);
    return this.ok(res, me);
  });

  matches = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const list = await this.service.getMatches(userId);
    return this.ok(res, list);
  });

  conversations = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const convos = await this.service.getConversations(userId);
    return this.ok(res, convos);
  });

  discover = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const recs = await this.service.getDiscover(userId);
    return this.ok(res, recs);
  });
}
