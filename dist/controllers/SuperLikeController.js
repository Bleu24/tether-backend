"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperLikeController = void 0;
const BaseController_1 = require("./BaseController");
class SuperLikeController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.canUse = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const result = await this.service.canUseSuperLike(userId);
            return this.ok(res, result);
        });
        this.create = this.handler(async (req, res) => {
            const userId = res.locals.userId;
            const receiverId = Number(req.body?.receiverId);
            const result = await this.service.superLike({ senderId: userId, receiverId });
            return this.created(res, result);
        });
    }
}
exports.SuperLikeController = SuperLikeController;
