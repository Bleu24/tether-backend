import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { BoostService } from "../services/BoostService";
import { BoostRepository } from "../repositories/BoostRepository";
import { DatabaseService } from "../services/DatabaseService";

export class BoostController extends BaseController {
  private readonly repo = new BoostRepository(DatabaseService.get());
  constructor(private readonly service: BoostService) { super(); }

  can = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const result = await this.service.canActivateBoost(userId);
    return this.ok(res, result);
  });

  activate = this.handler(async (req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const minutes = req.body?.minutes ? Number(req.body.minutes) : undefined;
    const result = await this.service.activate({ userId, minutes });
    return this.created(res, result);
  });

  status = this.handler(async (_req: Request, res: Response) => {
    const userId = res.locals.userId as number;
    const result = await this.service.getStatus(userId);
    return this.ok(res, result);
  });

  // Utility to query active boosts for a list of user ids
  activeFor = this.handler(async (req: Request, res: Response) => {
    const idsParam = String(req.query.ids || "");
    const ids = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
    await this.repo.deactivateExpired();
    const boostedIds = await this.repo.listActiveIds(ids);
    return this.ok(res, { boostedIds });
  });
}
