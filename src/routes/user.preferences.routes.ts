import { Router } from "express";
import { DatabaseService } from "../services/DatabaseService";
import { ProfilePreferenceRepository } from "../repositories/ProfilePreferenceRepository";
import { ProfilePreferenceService } from "../services/ProfilePreferenceService";
import { ProfilePreferenceController } from "../controllers/ProfilePreferenceController";

export function userPreferencesRouter(): Router {
    const router = Router({ mergeParams: true });

    const db = DatabaseService.get();
    const repo = new ProfilePreferenceRepository(db);
    const service = new ProfilePreferenceService(repo);
    const controller = new ProfilePreferenceController(service);

    router.get("/", controller.get);
    router.put("/", controller.update);

    return router;
}
