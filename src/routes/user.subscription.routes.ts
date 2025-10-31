import { Router } from "express";
import { SubscriptionController } from "../controllers/SubscriptionController";
import { SubscriptionService } from "../services/SubscriptionService";
import { UserRepository } from "../repositories/UserRepository";
import { DatabaseService } from "../services/DatabaseService";
import { ManualPaymentProvider } from "../services/payments/ManualPaymentProvider";

export function userSubscriptionRouter(): Router {
    const router = Router({ mergeParams: true });

    const db = DatabaseService.get();
    const users = new UserRepository(db);
    const payments = new ManualPaymentProvider();
    const service = new SubscriptionService(users, payments);
    const controller = new SubscriptionController(service);

    // POST /api/users/:userId/subscription { plan: 'plus'|'gold'|'premium' }
    router.post("/", controller.subscribe);
    // DELETE /api/users/:userId/subscription
    router.delete("/", controller.cancel);

    return router;
}
