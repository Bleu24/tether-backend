"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectionService = void 0;
const DatabaseService_1 = require("./DatabaseService");
const RejectionRepository_1 = require("../repositories/RejectionRepository");
const UserRepository_1 = require("../repositories/UserRepository");
const SwipeRepository_1 = require("../repositories/SwipeRepository");
class RejectionService {
    constructor() {
        this.rejections = new RejectionRepository_1.RejectionRepository(DatabaseService_1.DatabaseService.get());
        this.users = new UserRepository_1.UserRepository(DatabaseService_1.DatabaseService.get());
        this.swipes = new SwipeRepository_1.SwipeRepository(DatabaseService_1.DatabaseService.get());
    }
    async undo(swiperId, targetId) {
        const user = await this.users.findById(swiperId);
        if (!user)
            return { success: false, reason: "User not found" };
        if (!user.subscription_tier || user.subscription_tier === "free") {
            return { success: false, reason: "Subscription required" };
        }
        const { affected } = await this.rejections.undo(swiperId, targetId);
        if (affected > 0) {
            // Also clear PASS swipe record so the user can re-enter recommendations
            try {
                await this.swipes.deleteIfPass(swiperId, targetId);
            }
            catch { }
        }
        return { success: affected > 0 };
    }
}
exports.RejectionService = RejectionService;
