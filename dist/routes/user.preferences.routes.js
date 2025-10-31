"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPreferencesRouter = userPreferencesRouter;
const express_1 = require("express");
const DatabaseService_1 = require("../services/DatabaseService");
const ProfilePreferenceRepository_1 = require("../repositories/ProfilePreferenceRepository");
const ProfilePreferenceService_1 = require("../services/ProfilePreferenceService");
const ProfilePreferenceController_1 = require("../controllers/ProfilePreferenceController");
function userPreferencesRouter() {
    const router = (0, express_1.Router)({ mergeParams: true });
    const db = DatabaseService_1.DatabaseService.get();
    const repo = new ProfilePreferenceRepository_1.ProfilePreferenceRepository(db);
    const service = new ProfilePreferenceService_1.ProfilePreferenceService(repo);
    const controller = new ProfilePreferenceController_1.ProfilePreferenceController(service);
    router.get("/", controller.get);
    router.put("/", controller.update);
    return router;
}
