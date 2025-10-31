import { z } from "zod";
import { DatabaseService } from "./DatabaseService";
import { BoostRepository } from "../repositories/BoostRepository";
import { UserRepository } from "../repositories/UserRepository";

const BoostDTO = z.object({ userId: z.number().int().positive(), minutes: z.number().int().positive().max(120).optional() });

export class BoostService {
  private repo = new BoostRepository(DatabaseService.get());
  private users = new UserRepository(DatabaseService.get());

  async canActivateBoost(userId: number): Promise<{ canActivate: boolean; nextAvailableAt?: string; remaining?: number | null; window?: "weekly" | "cooldown" | "unlimited" }>{
    await this.repo.deactivateExpired();
    const user = await this.users.findById(userId);
    if (!user) return { canActivate: false };
    const active = await this.repo.hasActive(userId);
    if (active) return { canActivate: false };

    if (user.subscription_tier === 'premium') {
      // 1-hour cooldown between boosts
      const last = await this.repo.lastActivation(userId);
      if (!last) return { canActivate: true, remaining: 1, window: "cooldown" };
      const lastEnd = new Date(last.end_time);
      const next = new Date(lastEnd.getTime() + 60 * 60 * 1000);
      if (Date.now() < next.getTime()) return { canActivate: false, nextAvailableAt: next.toISOString(), remaining: 0, window: "cooldown" };
      return { canActivate: true, remaining: 1, window: "cooldown" };
    } else {
      // Free: 1 per week
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const count = await this.repo.countSince(userId, since);
      if (count > 0) {
        const last = await this.repo.lastActivation(userId);
        const lastStart = last ? new Date(last.start_time) : new Date();
        const next = new Date(lastStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { canActivate: false, nextAvailableAt: next.toISOString(), remaining: 0, window: "weekly" };
      }
      return { canActivate: true, remaining: 1, window: "weekly" };
    }
  }

  async activate(input: unknown): Promise<{ ok: true; start_time: string; end_time: string }>{
    const dto = BoostDTO.parse(input);
    const check = await this.canActivateBoost(dto.userId);
    if (!check.canActivate) throw new Error("Boost limit reached");
    const boost = await this.repo.activate(dto.userId, dto.minutes ?? 30);
    return { ok: true, start_time: boost.start_time, end_time: boost.end_time };
  }
}
