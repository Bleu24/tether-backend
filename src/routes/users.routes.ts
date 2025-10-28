import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { UserService } from "../services/UserService";
import { UserRepository } from "../repositories/UserRepository";
import { DatabaseService } from "../services/DatabaseService";

export function usersRouter(): Router {
    const router = Router();

    // Composition root for this module
    const db = DatabaseService.get();
    const repo = new UserRepository(db);
    const service = new UserService(repo);
    const controller = new UserController(service);

    router.get("/", controller.list);
    router.post("/", controller.create);

    return router;
}
