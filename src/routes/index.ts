import { Router } from "express";
import { usersRouter } from "./users.routes";
import { healthRouter } from "./health.routes";
import { swipesRouter } from "./swipes.routes";
import { matchesRouter } from "./matches.routes";
import { matchMessagesRouter } from "./match.messages.routes";
import { messagesRouter } from "./messages.routes";
import { meRouter } from "./me.routes";
import { authRouter } from "./auth.routes";
import { uploadsRouter } from "./uploads.routes";
import { rejectionsRouter } from "./rejections.routes";
import { superLikeRouter } from "./superlike.routes";
import { boostRouter } from "./boost.routes";

export function apiRouter(): Router {
    const router = Router();
    router.use("/health", healthRouter());
    router.use("/swipes", swipesRouter());
    router.use("/matches", matchesRouter());
    router.use("/matches/:matchId/messages", matchMessagesRouter());
    router.use("/messages", messagesRouter());
    router.use("/auth", authRouter());
    router.use("/uploads", uploadsRouter());
    router.use("/rejections", rejectionsRouter());
    router.use("/superlike", superLikeRouter());
    router.use("/boost", boostRouter());
    router.use("/me", meRouter());
    router.use("/users", usersRouter());
    return router;
}
