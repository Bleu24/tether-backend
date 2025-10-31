import { z } from "zod";
import { IUserRepository, UserRepository } from "../repositories/UserRepository";
import { PaymentProvider, PlanTier } from "./payments/PaymentProvider";
import { ResourceCreditRepository } from "../repositories/ResourceCreditRepository";
import { DatabaseService } from "./DatabaseService";
import { SuperLikeRepository } from "../repositories/SuperLikeRepository";

const PlanSchema = z.enum(["plus", "gold", "premium"]);

export class SubscriptionService {
    private credits = new ResourceCreditRepository(DatabaseService.get());
    private superlikes = new SuperLikeRepository(DatabaseService.get());
    constructor(private readonly users: IUserRepository, private readonly payments: PaymentProvider) {}

    async startCheckout(userId: number, planInput: unknown): Promise<{ sessionId: string }> {
        const plan = PlanSchema.parse(planInput) as Exclude<PlanTier, "free">;
        // Create a payment session with the provider (fake here)
        const session = await this.payments.initiateCheckout(userId, plan);
        // Determine previous tier before updating
        const prevUser = await (this.users as UserRepository).findById(userId);
        const prevTier: PlanTier = (prevUser?.subscription_tier ?? "free") as PlanTier;
        // Apply the tier immediately
        await this.users.updateProfile(userId, { subscription_tier: plan });

        // Grant carry-over credits for current window (super likes only)
        try {
            // Base quotas per tier
            const baseFor = (tier: PlanTier): number | null => {
                if (tier === "premium") return null; // unlimited
                if (tier === "gold") return 5;
                if (tier === "plus" || tier === "free") return 1;
                return 1;
            };
            const prevBase = baseFor(prevTier);
            const newBase = baseFor(plan as PlanTier);
            if (newBase !== null) {
                const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T',' ');
                const used = await this.superlikes.countSince(userId, since);
                const prevRemaining = Math.max(0, (prevBase ?? 0) - used);
                if (prevRemaining > 0) {
                    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0,19).replace('T',' ');
                    await this.credits.add(userId, 'super_like', prevRemaining, expiresAt);
                }
            }
        } catch { /* non-critical */ }
        return session;
    }

    async cancel(userId: number): Promise<void> {
        await this.payments.cancelSubscription(userId);
        await this.users.updateProfile(userId, { subscription_tier: "free" as PlanTier });
    }
}
