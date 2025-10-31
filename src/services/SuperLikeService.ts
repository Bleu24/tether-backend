import { z } from "zod";
import { DatabaseService } from "./DatabaseService";
import { SuperLikeRepository } from "../repositories/SuperLikeRepository";
import { RecommendationRepository } from "../repositories/RecommendationRepository";
import { UserRepository } from "../repositories/UserRepository";
import { WebSocketHub } from "../realtime/WebSocketHub";
import { SwipeRepository } from "../repositories/SwipeRepository";
import { SwipeService } from "./SwipeService";

const SuperLikeDTO = z.object({
  senderId: z.number().int().positive(),
  receiverId: z.number().int().positive(),
}).refine(v => v.senderId !== v.receiverId, { message: "Cannot super-like yourself", path: ["receiverId"] });

export class SuperLikeService {
  private repo = new SuperLikeRepository(DatabaseService.get());
  private rec = new RecommendationRepository(DatabaseService.get());
  private users = new UserRepository(DatabaseService.get());

  async canUseSuperLike(userId: number): Promise<{ canUse: boolean; nextAvailableAt?: string; remaining?: number | null; window?: "daily" | "unlimited" }>{
    const user = await this.users.findById(userId);
    if (!user) return { canUse: false };
    // Premium: unlimited
    if (user.subscription_tier === 'premium') return { canUse: true, remaining: null, window: "unlimited" };
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const count = await this.repo.countSince(userId, since);
    const remaining = Math.max(0, 1 - count);
    if (count > 0) {
      // Next available in 24h from last
      const { rows } = await DatabaseService.get().query<any>(
        `SELECT created_at FROM super_likes WHERE sender_id = ? ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      const last = rows[0]?.created_at ? new Date(rows[0].created_at) : null;
      const next = last ? new Date(last.getTime() + 24*60*60*1000) : new Date(Date.now() + 24*60*60*1000);
      return { canUse: false, nextAvailableAt: next.toISOString(), remaining, window: "daily" };
    }
    return { canUse: true, remaining, window: "daily" };
  }

  async superLike(input: unknown): Promise<{ ok: true }>{
    const dto = SuperLikeDTO.parse(input);
    const check = await this.canUseSuperLike(dto.senderId);
    if (!check.canUse) throw new Error("Super Like limit reached");
    await this.repo.create(dto.senderId, dto.receiverId);
    // Record a standard LIKE swipe as part of Super Like to ensure consistency with matches/likers
    try {
      const swipeSvc = new SwipeService(new SwipeRepository(DatabaseService.get()));
      await swipeSvc.record({ swiperId: dto.senderId, targetId: dto.receiverId, direction: "like" });
    } catch {}
    // Ensure receiver sees sender soon: queue and prioritize
    await this.rec.ensureQueued(dto.receiverId, [dto.senderId]);
    try {
      await DatabaseService.get().execute(
        `UPDATE recommendation_queue SET created_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
         WHERE user_id = ? AND target_id = ? AND status = 'queued'`,
        [dto.receiverId, dto.senderId]
      );
    } catch {}
    // Realtime notify receiver
    try {
      WebSocketHub.get().sendToUser(dto.receiverId, 'superlike:received', { fromUserId: dto.senderId });
    } catch {}
    return { ok: true };
  }
}
