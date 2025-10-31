"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeController = void 0;
const BaseController_1 = require("./BaseController");
const jwt_1 = require("../middleware/jwt");
class MeController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.profile = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const me = await this.service.getProfile(userId);
            if (!me) {
                // If the token references a non-existent user, clear cookie and return 401
                (0, jwt_1.clearAuthCookie)(res);
                return this.fail(res, "Unauthorized", 401);
            }
            return this.ok(res, me);
        });
        this.matches = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const list = await this.service.getMatches(userId);
            return this.ok(res, list);
        });
        this.conversations = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const convos = await this.service.getConversations(userId);
            return this.ok(res, convos);
        });
        this.discover = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const recs = await this.service.getDiscover(userId);
            return this.ok(res, recs);
        });
        this.likers = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const users = await this.service.getLikers(userId);
            return this.ok(res, users);
        });
        this.superLikers = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const users = await this.service.getSuperLikers(userId);
            return this.ok(res, users);
        });
        // Pending match celebrations and mark-as-seen can be delegated through MeService
        this.pendingMatchCelebrations = this.handler(async (_req, res) => {
            const userId = res.locals.userId;
            const list = await this.service.getPendingCelebrations(userId);
            return this.ok(res, list);
        });
        this.markMatchCelebrationSeen = this.handler(async (req, res) => {
            const userId = res.locals.userId;
            const matchId = Number(req.params.id);
            await this.service.markCelebrationSeen(matchId, userId);
            return this.ok(res, { id: matchId, seen: true });
        });
    }
}
exports.MeController = MeController;
