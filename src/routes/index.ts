import { Router } from "express";
import { usersRouter } from "./users.routes";
import { healthRouter } from "./health.routes";

export function apiRouter(): Router {
    const router = Router();
    router.use("/health", healthRouter());
    router.use("/users", usersRouter());
    return router;
}
