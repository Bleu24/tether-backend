import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { MeService } from "../services/MeService";
import { clearAuthCookie } from "../middleware/jwt";

export class MeController extends BaseController {
  constructor(private readonly service: MeService) {
    super();
  }

  profile = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const me = await this.service.getProfile(userId);
    if (!me) {
      // If the token references a non-existent user, clear cookie and return 401
      clearAuthCookie(res);
      return this.fail(res, "Unauthorized", 401);
    }
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

  likers = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const users = await this.service.getLikers(userId);
    return this.ok(res, users);
  });

  // Pending match celebrations and mark-as-seen can be delegated through MeService
  pendingMatchCelebrations = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const list = await this.service.getPendingCelebrations(userId);
    return this.ok(res, list);
  });

  markMatchCelebrationSeen = this.handler(async (req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const matchId = Number(req.params.id);
    await this.service.markCelebrationSeen(matchId, userId);
    return this.ok(res, { id: matchId, seen: true });
  });
}
