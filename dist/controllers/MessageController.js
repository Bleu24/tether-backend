"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const BaseController_1 = require("./BaseController");
class MessageController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.listForMatch = this.handler(async (req, res) => {
            const matchId = Number(req.params.matchId);
            const userId = Number(req.query.userId);
            const data = await this.service.listByMatch(matchId, userId);
            return this.ok(res, data);
        });
        this.createForMatch = this.handler(async (req, res) => {
            const matchId = Number(req.params.matchId);
            const { senderId, content } = req.body ?? {};
            const message = await this.service.create({ matchId, senderId: Number(senderId), content });
            return this.created(res, message);
        });
        this.update = this.handler(async (req, res) => {
            const id = Number(req.params.id);
            const { senderId, content } = req.body ?? {};
            const updated = await this.service.update({ id, senderId: Number(senderId), content });
            return this.ok(res, updated);
        });
        this.remove = this.handler(async (req, res) => {
            const id = Number(req.params.id);
            const scope = String(req.query.scope || 'self');
            const requesterId = Number(req.query.userId || req.body?.userId);
            if (scope === 'everyone') {
                await this.service.deleteForEveryone(id, requesterId);
            }
            else {
                await this.service.deleteForUser(id, requesterId);
            }
            return this.ok(res, { id, scope });
        });
        this.markSeen = this.handler(async (req, res) => {
            const id = Number(req.params.id);
            const requesterId = Number(req.body?.userId || req.query.userId);
            const m = await this.service.markSeen(id, requesterId);
            return this.ok(res, m);
        });
    }
}
exports.MessageController = MessageController;
