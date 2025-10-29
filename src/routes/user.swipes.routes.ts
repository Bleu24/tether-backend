import { Router } from "express";
import { DatabaseService } from "../services/DatabaseService";
import { SwipeRepository } from "../repositories/SwipeRepository";
import { SwipeService } from "../services/SwipeService";
import { SwipeController } from "../controllers/SwipeController";

export function userSwipesRouter(): Router {
    const router = Router({ mergeParams: true });

    const db = DatabaseService.get();
    const repo = new SwipeRepository(db);
    const service = new SwipeService(repo);
    const controller = new SwipeController(service);

    router.get("/", controller.listBySwiper); // GET /api/users/:userId/swipes

    return router;
}
