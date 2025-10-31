"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = usersRouter;
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const UserService_1 = require("../services/UserService");
const UserRepository_1 = require("../repositories/UserRepository");
const DatabaseService_1 = require("../services/DatabaseService");
const user_preferences_routes_1 = require("./user.preferences.routes");
const user_swipes_routes_1 = require("./user.swipes.routes");
const user_matches_routes_1 = require("./user.matches.routes");
const user_subscription_routes_1 = require("./user.subscription.routes");
function usersRouter() {
    const router = (0, express_1.Router)();
    // Composition root for this module
    const db = DatabaseService_1.DatabaseService.get();
    const repo = new UserRepository_1.UserRepository(db);
    const service = new UserService_1.UserService(repo);
    const controller = new UserController_1.UserController(service);
    router.get("/", controller.list);
    router.post("/", controller.create);
    router.get("/:id", controller.get);
    router.put("/:id", controller.update);
    router.delete("/:id", controller.delete);
    // nested routes for a user's profile preferences
    router.use("/:userId/preferences", (0, user_preferences_routes_1.userPreferencesRouter)());
    // nested routes for a user's swipes
    router.use("/:userId/swipes", (0, user_swipes_routes_1.userSwipesRouter)());
    // nested routes for a user's matches
    router.use("/:userId/matches", (0, user_matches_routes_1.userMatchesRouter)());
    // nested route for a user's subscription
    router.use("/:userId/subscription", (0, user_subscription_routes_1.userSubscriptionRouter)());
    return router;
}
