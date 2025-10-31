"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualPaymentProvider = void 0;
// A trivial provider that pretends checkout succeeds immediately.
class ManualPaymentProvider {
    async initiateCheckout(userId, plan) {
        // In a real integration, you would create a payment session with Stripe/PayMongo/etc.
        // Here we return a fake session id immediately.
        return { sessionId: `manual_${userId}_${plan}_${Date.now()}` };
    }
    async cancelSubscription(_userId) {
        // Nothing to do for manual provider
        return;
    }
}
exports.ManualPaymentProvider = ManualPaymentProvider;
