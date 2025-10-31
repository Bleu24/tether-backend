"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = healthRouter;
const express_1 = require("express");
function healthRouter() {
    const router = (0, express_1.Router)();
    router.get("/", (_req, res) => {
        res.json({ status: "ok" });
    });
    return router;
}
