"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionController = void 0;
const BaseController_1 = require("./BaseController");
class SubscriptionController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.subscribe = this.handler(async (req, res) => {
            const userId = Number(req.params.userId || req.params.id);
            if (!Number.isFinite(userId))
                return this.fail(res, "Invalid user id", 400);
            const { plan } = req.body || {};
            const session = await this.service.startCheckout(userId, plan);
            return this.ok(res, { session });
        });
        this.cancel = this.handler(async (req, res) => {
            const userId = Number(req.params.userId || req.params.id);
            if (!Number.isFinite(userId))
                return this.fail(res, "Invalid user id", 400);
            await this.service.cancel(userId);
            return this.ok(res, { status: "ok" });
        });
    }
}
exports.SubscriptionController = SubscriptionController;
