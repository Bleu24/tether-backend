"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperLikeService = void 0;
const zod_1 = require("zod");
const DatabaseService_1 = require("./DatabaseService");
const SuperLikeRepository_1 = require("../repositories/SuperLikeRepository");
const RecommendationRepository_1 = require("../repositories/RecommendationRepository");
const UserRepository_1 = require("../repositories/UserRepository");
const WebSocketHub_1 = require("../realtime/WebSocketHub");
const SwipeRepository_1 = require("../repositories/SwipeRepository");
const SwipeService_1 = require("./SwipeService");
const ResourceCreditRepository_1 = require("../repositories/ResourceCreditRepository");
const SuperLikeDTO = zod_1.z.object({
    senderId: zod_1.z.number().int().positive(),
    receiverId: zod_1.z.number().int().positive(),
}).refine(v => v.senderId !== v.receiverId, { message: "Cannot super-like yourself", path: ["receiverId"] });
class SuperLikeService {
    constructor() {
        this.repo = new SuperLikeRepository_1.SuperLikeRepository(DatabaseService_1.DatabaseService.get());
        this.rec = new RecommendationRepository_1.RecommendationRepository(DatabaseService_1.DatabaseService.get());
        this.users = new UserRepository_1.UserRepository(DatabaseService_1.DatabaseService.get());
        this.credits = new ResourceCreditRepository_1.ResourceCreditRepository(DatabaseService_1.DatabaseService.get());
    }
    async canUseSuperLike(userId) {
        const user = await this.users.findById(userId);
        if (!user)
            return { canUse: false };
        const tier = user.subscription_tier || 'free';
        // Premium: unlimited
        if (tier === 'premium')
            return { canUse: true, remaining: null, window: "unlimited" };
        const base = tier === 'gold' ? 5 : 1; // free/plus:1, gold:5
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const count = await this.repo.countSince(userId, since);
        const credit = await this.credits.sumActive(userId, 'super_like');
        const remaining = Math.max(0, base + credit - count);
        // Only expose nextAvailableAt if the user has exhausted their quota for the window
        if (remaining <= 0) {
            const { rows } = await DatabaseService_1.DatabaseService.get().query(`SELECT created_at FROM super_likes WHERE sender_id = ? ORDER BY created_at DESC LIMIT 1`, [userId]);
            const last = rows[0]?.created_at ? new Date(rows[0].created_at) : null;
            const next = last ? new Date(last.getTime() + 24 * 60 * 60 * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
            return { canUse: false, nextAvailableAt: next.toISOString(), remaining: 0, window: "daily" };
        }
        return { canUse: true, remaining, window: "daily" };
    }
    async superLike(input) {
        const dto = SuperLikeDTO.parse(input);
        const check = await this.canUseSuperLike(dto.senderId);
        if (!check.canUse)
            throw new Error("Super Like limit reached");
        await this.repo.create(dto.senderId, dto.receiverId);
        // Record a standard LIKE swipe as part of Super Like to ensure consistency with matches/likers
        try {
            const swipeSvc = new SwipeService_1.SwipeService(new SwipeRepository_1.SwipeRepository(DatabaseService_1.DatabaseService.get()));
            await swipeSvc.record({ swiperId: dto.senderId, targetId: dto.receiverId, direction: "like" });
        }
        catch { }
        // Ensure receiver sees sender soon: queue and prioritize
        await this.rec.ensureQueued(dto.receiverId, [dto.senderId]);
        try {
            await DatabaseService_1.DatabaseService.get().execute(`UPDATE recommendation_queue SET created_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 DAY)
         WHERE user_id = ? AND target_id = ? AND status = 'queued'`, [dto.receiverId, dto.senderId]);
        }
        catch { }
        // Realtime notify receiver
        try {
            WebSocketHub_1.WebSocketHub.get().sendToUser(dto.receiverId, 'superlike:received', { fromUserId: dto.senderId });
        }
        catch { }
        return { ok: true };
    }
}
exports.SuperLikeService = SuperLikeService;
