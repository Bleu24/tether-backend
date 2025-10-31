import { z } from "zod";
import { IUserRepository, UserRepository } from "../repositories/UserRepository";
import { PaymentProvider, PlanTier } from "./payments/PaymentProvider";

const PlanSchema = z.enum(["plus", "gold", "premium"]);

export class SubscriptionService {
    constructor(private readonly users: IUserRepository, private readonly payments: PaymentProvider) {}

    async startCheckout(userId: number, planInput: unknown): Promise<{ sessionId: string }> {
        const plan = PlanSchema.parse(planInput) as Exclude<PlanTier, "free">;
        // Create a payment session with the provider (fake here)
        const session = await this.payments.initiateCheckout(userId, plan);
        // For our manual flow, we apply the tier immediately
        await this.users.updateProfile(userId, { subscription_tier: plan });
        return session;
    }

    async cancel(userId: number): Promise<void> {
        await this.payments.cancelSubscription(userId);
        await this.users.updateProfile(userId, { subscription_tier: "free" as PlanTier });
    }
}
