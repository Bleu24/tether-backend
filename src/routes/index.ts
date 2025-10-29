import { Router } from "express";
import { usersRouter } from "./users.routes";
import { healthRouter } from "./health.routes";
import { swipesRouter } from "./swipes.routes";
import { matchesRouter } from "./matches.routes";
import { matchMessagesRouter } from "./match.messages.routes";
import { messagesRouter } from "./messages.routes";

export function apiRouter(): Router {
    const router = Router();
    router.use("/health", healthRouter());
    router.use("/swipes", swipesRouter());
    router.use("/matches", matchesRouter());
    router.use("/matches/:matchId/messages", matchMessagesRouter());
    router.use("/messages", messagesRouter());
    router.use("/users", usersRouter());
    return router;
}
