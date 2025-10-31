"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectionsRouter = rejectionsRouter;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const RejectionService_1 = require("../services/RejectionService");
const RejectionController_1 = require("../controllers/RejectionController");
function rejectionsRouter() {
    const router = (0, express_1.Router)();
    const service = new RejectionService_1.RejectionService();
    const controller = new RejectionController_1.RejectionController(service);
    router.use(auth_1.requireUser);
    router.post("/undo", controller.undo);
    return router;
}
