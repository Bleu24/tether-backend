"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boostRouter = boostRouter;
const express_1 = require("express");
const BoostService_1 = require("../services/BoostService");
const BoostController_1 = require("../controllers/BoostController");
const auth_1 = require("../middleware/auth");
function boostRouter() {
    const router = (0, express_1.Router)();
    const controller = new BoostController_1.BoostController(new BoostService_1.BoostService());
    router.use(auth_1.requireUser);
    router.get("/can", controller.can);
    router.get("/status", controller.status);
    router.get("/active", controller.activeFor);
    router.post("/", controller.activate);
    return router;
}
