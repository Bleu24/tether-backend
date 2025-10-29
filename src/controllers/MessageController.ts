import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { MessageService } from "../services/MessageService";

export class MessageController extends BaseController {
  constructor(private readonly service: MessageService) {
    super();
  }

  listForMatch = this.handler(async (req: Request, res: Response) => {
    const matchId = Number(req.params.matchId);
    const userId = Number(req.query.userId);
    const data = await this.service.listByMatch(matchId, userId);
    return this.ok(res, data);
  });

  createForMatch = this.handler(async (req: Request, res: Response) => {
    const matchId = Number(req.params.matchId);
    const { senderId, content } = req.body ?? {};
    const message = await this.service.create({ matchId, senderId: Number(senderId), content });
    return this.created(res, message);
  });

  update = this.handler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { senderId, content } = req.body ?? {};
    const updated = await this.service.update({ id, senderId: Number(senderId), content });
    return this.ok(res, updated);
  });

  remove = this.handler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const scope = String(req.query.scope || 'self');
    const requesterId = Number(req.query.userId || req.body?.userId);
    if (scope === 'everyone') {
      await this.service.deleteForEveryone(id, requesterId);
    } else {
      await this.service.deleteForUser(id, requesterId);
    }
    return this.ok(res, { id, scope });
  });

  markSeen = this.handler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const requesterId = Number(req.body?.userId || req.query.userId);
    const m = await this.service.markSeen(id, requesterId);
    return this.ok(res, m);
  });
}
