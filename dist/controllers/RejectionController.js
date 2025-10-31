"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectionController = void 0;
const BaseController_1 = require("./BaseController");
class RejectionController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.undo = this.handler(async (req, res) => {
            const userId = res.locals.userId;
            const targetId = Number(req.body?.targetId);
            if (!targetId || isNaN(targetId))
                return this.fail(res, "Invalid targetId", 400);
            const result = await this.service.undo(userId, targetId);
            if (!result.success)
                return this.fail(res, result.reason || "Unable to undo", result.reason === "Subscription required" ? 402 : 400);
            return this.ok(res, { undone: true });
        });
    }
}
exports.RejectionController = RejectionController;
