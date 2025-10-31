"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superLikeRouter = superLikeRouter;
const express_1 = require("express");
const SuperLikeService_1 = require("../services/SuperLikeService");
const SuperLikeController_1 = require("../controllers/SuperLikeController");
const auth_1 = require("../middleware/auth");
function superLikeRouter() {
    const router = (0, express_1.Router)();
    const controller = new SuperLikeController_1.SuperLikeController(new SuperLikeService_1.SuperLikeService());
    router.use(auth_1.requireUser);
    router.get("/can", controller.canUse);
    router.post("/", controller.create);
    return router;
}
