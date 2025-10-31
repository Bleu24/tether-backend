"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = meRouter;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const MeService_1 = require("../services/MeService");
const MeController_1 = require("../controllers/MeController");
function meRouter() {
    const router = (0, express_1.Router)();
    const service = new MeService_1.MeService();
    const controller = new MeController_1.MeController(service);
    router.use(auth_1.requireUser);
    router.get("/", controller.profile);
    router.get("/matches", controller.matches);
    router.get("/conversations", controller.conversations);
    router.get("/discover", controller.discover);
    router.get("/likers", controller.likers);
    router.get("/superlikers", controller.superLikers);
    router.get("/matches/pending-celebrations", controller.pendingMatchCelebrations);
    router.post("/matches/:id/celebration-seen", controller.markMatchCelebrationSeen);
    return router;
}
