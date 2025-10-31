"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = authRouter;
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
function authRouter() {
    const router = (0, express_1.Router)();
    const controller = new AuthController_1.AuthController();
    router.post("/signup", controller.signup);
    router.post("/login", controller.login);
    router.post("/logout", controller.logout);
    return router;
}
