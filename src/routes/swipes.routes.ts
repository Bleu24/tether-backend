import { Router } from "express";
import { DatabaseService } from "../services/DatabaseService";
import { SwipeRepository } from "../repositories/SwipeRepository";
import { SwipeService } from "../services/SwipeService";
import { SwipeController } from "../controllers/SwipeController";

export function swipesRouter(): Router {
    const router = Router();

    const db = DatabaseService.get();
    const repo = new SwipeRepository(db);
    const service = new SwipeService(repo);
    const controller = new SwipeController(service);

    router.post("/", controller.create);
    router.get("/", controller.listBySwiper); // GET /api/swipes?swiperId=1&limit=100

    return router;
}
