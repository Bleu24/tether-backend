"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRouter = messagesRouter;
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const MessageRepository_1 = require("../repositories/MessageRepository");
const MatchRepository_1 = require("../repositories/MatchRepository");
const MessageService_1 = require("../services/MessageService");
const MessageController_1 = require("../controllers/MessageController");
const WebSocketMessagePublisher_1 = require("../realtime/WebSocketMessagePublisher");
function messagesRouter() {
    const router = (0, express_1.Router)();
    const db = DatabaseService_1.DatabaseService.get();
    const messagesRepo = new MessageRepository_1.MessageRepository(db);
    const matchesRepo = new MatchRepository_1.MatchRepository(db);
    const publisher = WebSocketMessagePublisher_1.WebSocketMessagePublisher.get();
    const service = new MessageService_1.MessageService(messagesRepo, matchesRepo, publisher);
    const controller = new MessageController_1.MessageController(service);
    router.put("/:id", controller.update);
    router.delete("/:id", controller.remove);
    router.post("/:id/seen", controller.markSeen);
    return router;
}
