"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwipeController = void 0;
const BaseController_1 = require("./BaseController");
class SwipeController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.create = this.handler(async (req, res) => {
            const swipe = await this.service.record(req.body);
            return this.created(res, swipe);
        });
        this.listBySwiper = this.handler(async (req, res) => {
            const userId = Number(req.params.userId ?? req.query.swiperId);
            const limit = req.query.limit ? Number(req.query.limit) : undefined;
            const swipes = await this.service.listBySwiper(userId, limit);
            return this.ok(res, swipes);
        });
    }
}
exports.SwipeController = SwipeController;
