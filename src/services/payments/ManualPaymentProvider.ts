import { PaymentProvider, PlanTier } from "./PaymentProvider";

// A trivial provider that pretends checkout succeeds immediately.
export class ManualPaymentProvider implements PaymentProvider {
    async initiateCheckout(userId: number, plan: Exclude<PlanTier, "free">): Promise<{ sessionId: string }> {
        // In a real integration, you would create a payment session with Stripe/PayMongo/etc.
        // Here we return a fake session id immediately.
        return { sessionId: `manual_${userId}_${plan}_${Date.now()}` };
    }

    async cancelSubscription(_userId: number): Promise<void> {
        // Nothing to do for manual provider
        return;
    }
}
