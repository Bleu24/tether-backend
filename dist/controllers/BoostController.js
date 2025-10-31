"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoostController = void 0;
const BaseController_1 = require("./BaseController");
const BoostRepository_1 = require("../repositories/BoostRepository");
const DatabaseService_1 = require("../services/DatabaseService");
class BoostController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.repo = new BoostRepository_1.BoostRepository(DatabaseService_1.DatabaseService.get());
        this.can = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const result = await this.service.canActivateBoost(userId);
            return this.ok(res, result);
        });
        this.activate = this.handler(async (req, res) => {
            const userId = res.locals.userId;
            const minutes = req.body?.minutes ? Number(req.body.minutes) : undefined;
            const result = await this.service.activate({ userId, minutes });
            return this.created(res, result);
        });
        this.status = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const result = await this.service.getStatus(userId);
            return this.ok(res, result);
        });
        // Utility to query active boosts for a list of user ids
        this.activeFor = this.handler(async (req, res) => {
            const idsParam = String(req.query.ids || "");
            const ids = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
            await this.repo.deactivateExpired();
            const boostedIds = await this.repo.listActiveIds(ids);
            return this.ok(res, { boostedIds });
        });
    }
}
exports.BoostController = BoostController;
