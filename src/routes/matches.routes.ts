import { Router } from "express";
import { DatabaseService } from "../services/DatabaseService";
import { MatchRepository } from "../repositories/MatchRepository";
import { MatchService } from "../services/MatchService";
import { MatchController } from "../controllers/MatchController";

export function matchesRouter(): Router {
    const router = Router();

    const db = DatabaseService.get();
    const repo = new MatchRepository(db);
    const service = new MatchService(repo);
    const controller = new MatchController(service);

    router.post("/check", controller.check); // {userAId,userBId}
    router.get("/", controller.listForUser); // /api/matches?userId=1
    router.delete(":id", controller.deactivate);

    return router;
}
