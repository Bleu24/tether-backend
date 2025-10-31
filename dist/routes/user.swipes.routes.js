"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSwipesRouter = userSwipesRouter;
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const SwipeRepository_1 = require("../repositories/SwipeRepository");
const SwipeService_1 = require("../services/SwipeService");
const SwipeController_1 = require("../controllers/SwipeController");
function userSwipesRouter() {
    const router = (0, express_1.Router)({ mergeParams: true });
    const db = DatabaseService_1.DatabaseService.get();
    const repo = new SwipeRepository_1.SwipeRepository(db);
    const service = new SwipeService_1.SwipeService(repo);
    const controller = new SwipeController_1.SwipeController(service);
    router.get("/", controller.listBySwiper); // GET /api/users/:userId/swipes
    return router;
}
