import { DatabaseService } from "./DatabaseService";
import { RejectionRepository } from "../repositories/RejectionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { SwipeRepository } from "../repositories/SwipeRepository";

export class RejectionService {
  private rejections = new RejectionRepository(DatabaseService.get());
  private users = new UserRepository(DatabaseService.get());
  private swipes = new SwipeRepository(DatabaseService.get());

  async undo(swiperId: number, targetId: number): Promise<{ success: boolean; reason?: string }> {
    const user = await this.users.findById(swiperId);
    if (!user) return { success: false, reason: "User not found" };
    if (!user.subscription_tier || user.subscription_tier === "free") {
      return { success: false, reason: "Subscription required" };
    }
    const { affected } = await this.rejections.undo(swiperId, targetId);
    if (affected > 0) {
      // Also clear PASS swipe record so the user can re-enter recommendations
      try { await this.swipes.deleteIfPass(swiperId, targetId); } catch {}
    }
    return { success: affected > 0 };
  }
}
