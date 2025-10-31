"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = apiRouter;
const express_1 = require("express");
const users_routes_1 = require("./users.routes");
const health_routes_1 = require("./health.routes");
const swipes_routes_1 = require("./swipes.routes");
const matches_routes_1 = require("./matches.routes");
const match_messages_routes_1 = require("./match.messages.routes");
const messages_routes_1 = require("./messages.routes");
const me_routes_1 = require("./me.routes");
const auth_routes_1 = require("./auth.routes");
const uploads_routes_1 = require("./uploads.routes");
const rejections_routes_1 = require("./rejections.routes");
const superlike_routes_1 = require("./superlike.routes");
const boost_routes_1 = require("./boost.routes");
const location_routes_1 = require("./location.routes");
const files_routes_1 = require("./files.routes");
function apiRouter() {
    const router = (0, express_1.Router)();
    router.use("/health", (0, health_routes_1.healthRouter)());
    router.use("/swipes", (0, swipes_routes_1.swipesRouter)());
    router.use("/matches", (0, matches_routes_1.matchesRouter)());
    router.use("/matches/:matchId/messages", (0, match_messages_routes_1.matchMessagesRouter)());
    router.use("/messages", (0, messages_routes_1.messagesRouter)());
    router.use("/auth", (0, auth_routes_1.authRouter)());
    router.use("/uploads", (0, uploads_routes_1.uploadsRouter)());
    router.use("/rejections", (0, rejections_routes_1.rejectionsRouter)());
    router.use("/superlike", (0, superlike_routes_1.superLikeRouter)());
    router.use("/boost", (0, boost_routes_1.boostRouter)());
    router.use("/update-location", (0, location_routes_1.locationRouter)());
    // Proxy for R2/S3 files when public URL is not available (avoids CORS)
    router.use("/files", (0, files_routes_1.filesRouter)());
    router.use("/me", (0, me_routes_1.meRouter)());
    router.use("/users", (0, users_routes_1.usersRouter)());
    return router;
}
