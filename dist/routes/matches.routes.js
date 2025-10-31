"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchesRouter = matchesRouter;
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const MatchRepository_1 = require("../repositories/MatchRepository");
const MatchService_1 = require("../services/MatchService");
const MatchController_1 = require("../controllers/MatchController");
function matchesRouter() {
    const router = (0, express_1.Router)();
    const db = DatabaseService_1.DatabaseService.get();
    const repo = new MatchRepository_1.MatchRepository(db);
    const service = new MatchService_1.MatchService(repo);
    const controller = new MatchController_1.MatchController(service);
    router.post("/check", controller.check); // {userAId,userBId}
    router.get("/", controller.listForUser); // /api/matches?userId=1
    router.delete(":id", controller.deactivate);
    return router;
}
