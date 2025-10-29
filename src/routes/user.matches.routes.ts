import { Router } from "express";
import { DatabaseService } from "../services/DatabaseService";
import { MatchRepository } from "../repositories/MatchRepository";
import { MatchService } from "../services/MatchService";
import { MatchController } from "../controllers/MatchController";

export function userMatchesRouter(): Router {
    const router = Router({ mergeParams: true });

    const db = DatabaseService.get();
    const repo = new MatchRepository(db);
    const service = new MatchService(repo);
    const controller = new MatchController(service);

    router.get("/", controller.listForUser); // /api/users/:userId/matches

    return router;
}
