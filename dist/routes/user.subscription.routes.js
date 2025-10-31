"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSubscriptionRouter = userSubscriptionRouter;
const express_1 = require("express");
const SubscriptionController_1 = require("../controllers/SubscriptionController");
const SubscriptionService_1 = require("../services/SubscriptionService");
const UserRepository_1 = require("../repositories/UserRepository");
const DatabaseService_1 = require("../services/DatabaseService");
const ManualPaymentProvider_1 = require("../services/payments/ManualPaymentProvider");
function userSubscriptionRouter() {
    const router = (0, express_1.Router)({ mergeParams: true });
    const db = DatabaseService_1.DatabaseService.get();
    const users = new UserRepository_1.UserRepository(db);
    const payments = new ManualPaymentProvider_1.ManualPaymentProvider();
    const service = new SubscriptionService_1.SubscriptionService(users, payments);
    const controller = new SubscriptionController_1.SubscriptionController(service);
    // POST /api/users/:userId/subscription { plan: 'plus'|'gold'|'premium' }
    router.post("/", controller.subscribe);
    // DELETE /api/users/:userId/subscription
    router.delete("/", controller.cancel);
    return router;
}
