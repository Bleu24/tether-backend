"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchController = void 0;
const BaseController_1 = require("./BaseController");
class MatchController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.check = this.handler(async (req, res) => {
            const result = await this.service.checkOrCreateForPair(req.body);
            return this.ok(res, result);
        });
        this.listForUser = this.handler(async (req, res) => {
            const userId = Number(req.params.userId ?? req.query.userId);
            const data = await this.service.listForUser(userId);
            return this.ok(res, data);
        });
        this.deactivate = this.handler(async (req, res) => {
            const id = Number(req.params.id);
            await this.service.deactivate(id);
            return this.ok(res, { id, is_active: 0 });
        });
    }
}
exports.MatchController = MatchController;
