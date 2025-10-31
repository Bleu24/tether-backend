"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const zod_1 = require("zod");
const ResourceCreditRepository_1 = require("../repositories/ResourceCreditRepository");
const DatabaseService_1 = require("./DatabaseService");
const SuperLikeRepository_1 = require("../repositories/SuperLikeRepository");
const PlanSchema = zod_1.z.enum(["plus", "gold", "premium"]);
class SubscriptionService {
    constructor(users, payments) {
        this.users = users;
        this.payments = payments;
        this.credits = new ResourceCreditRepository_1.ResourceCreditRepository(DatabaseService_1.DatabaseService.get());
        this.superlikes = new SuperLikeRepository_1.SuperLikeRepository(DatabaseService_1.DatabaseService.get());
    }
    async startCheckout(userId, planInput) {
        const plan = PlanSchema.parse(planInput);
        // Create a payment session with the provider (fake here)
        const session = await this.payments.initiateCheckout(userId, plan);
        // Determine previous tier before updating
        const prevUser = await this.users.findById(userId);
        const prevTier = (prevUser?.subscription_tier ?? "free");
        // Apply the tier immediately
        await this.users.updateProfile(userId, { subscription_tier: plan });
        // Grant carry-over credits for current window (super likes only)
        try {
            // Only grant on an upgrade (strictly higher tier), never on same-tier re-subscribe or downgrade
            const rank = (t) => ({ free: 0, plus: 1, gold: 2, premium: 3 }[t]);
            const isUpgrade = rank(plan) > rank(prevTier);
            if (!isUpgrade) {
                return session;
            }
            // Base quotas per tier
            const baseFor = (tier) => {
                if (tier === "premium")
                    return null; // unlimited
                if (tier === "gold")
                    return 5;
                if (tier === "plus" || tier === "free")
                    return 1;
                return 1;
            };
            const prevBase = baseFor(prevTier);
            const newBase = baseFor(plan);
            if (newBase !== null) {
                const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
                const used = await this.superlikes.countSince(userId, since);
                const prevRemaining = Math.max(0, (prevBase ?? 0) - used);
                if (prevRemaining > 0) {
                    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
                    await this.credits.add(userId, 'super_like', prevRemaining, expiresAt);
                }
            }
        }
        catch { /* non-critical */ }
        return session;
    }
    async cancel(userId) {
        await this.payments.cancelSubscription(userId);
        await this.users.updateProfile(userId, { subscription_tier: "free" });
    }
}
exports.SubscriptionService = SubscriptionService;
