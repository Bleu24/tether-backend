"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationRouter = locationRouter;
const express_1 = require("express");
const LocationController_1 = require("../controllers/LocationController");
function locationRouter() {
    const router = (0, express_1.Router)();
    const controller = new LocationController_1.LocationController();
    // POST /api/update-location
    router.post("/", controller.update);
    return router;
}
