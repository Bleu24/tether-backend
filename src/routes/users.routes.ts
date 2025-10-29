import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { UserService } from "../services/UserService";
import { UserRepository } from "../repositories/UserRepository";
import { DatabaseService } from "../services/DatabaseService";
import { userPreferencesRouter } from "./user.preferences.routes";

export function usersRouter(): Router {
    const router = Router();

    // Composition root for this module
    const db = DatabaseService.get();
    const repo = new UserRepository(db);
    const service = new UserService(repo);
    const controller = new UserController(service);

    router.get("/", controller.list);
    router.post("/", controller.create);
    router.get(":id", controller.get);
    router.put(":id", controller.update);

    // nested routes for a user's profile preferences
    router.use(":userId/preferences", userPreferencesRouter());

    return router;
}
