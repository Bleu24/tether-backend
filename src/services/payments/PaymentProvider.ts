export type PlanTier = "free" | "plus" | "gold" | "premium";

export interface PaymentProvider {
    /**
     * Start a checkout for a given user and plan. In a real provider this would return a redirect URL or session id.
     */
    initiateCheckout(userId: number, plan: Exclude<PlanTier, "free">): Promise<{ sessionId: string }>;

    /**
     * Cancel an active subscription for a user.
     */
    cancelSubscription(userId: number): Promise<void>;
}
