import { Request, Response } from "express";
import { z } from "zod";
import { BaseController } from "./BaseController";
import { UserRepository } from "../repositories/UserRepository";
import { DatabaseService } from "../services/DatabaseService";
import { RecommendationRepository } from "../repositories/RecommendationRepository";
import { WebSocketHub } from "../realtime/WebSocketHub";

const UpdateLocationDTO = z.object({
  userId: z.number().int().positive(),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});

export class LocationController extends BaseController {
  private readonly users = new UserRepository(DatabaseService.get());

  update = this.handler(async (req: Request, res: Response) => {
    const parsed = UpdateLocationDTO.safeParse(req.body);
    if (!parsed.success) return this.fail(res, parsed.error.message, 400);
    const { userId, latitude, longitude } = parsed.data;

    const authUserId = Number(res.locals.userId);
    if (!Number.isFinite(authUserId) || authUserId !== userId) {
      return this.fail(res, "Forbidden", 403);
    }

    const updated = await this.users.updateLocation(userId, latitude, longitude);
    // Invalidate queued recommendations and notify client to refresh
    try {
      const rec = new RecommendationRepository(DatabaseService.get());
      await rec.clearForUser(userId);
    } catch {}
    try { WebSocketHub.get().sendToUser(userId, "discover:refresh", { changed: ["location"] }); } catch {}
    return this.ok(res, { id: updated.id, latitude: updated.latitude, longitude: updated.longitude, last_seen: updated.last_seen });
  });
}
