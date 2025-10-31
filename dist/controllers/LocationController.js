"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationController = void 0;
const zod_1 = require("zod");
const BaseController_1 = require("./BaseController");
const UserRepository_1 = require("../repositories/UserRepository");
const DatabaseService_1 = require("../services/DatabaseService");
const RecommendationRepository_1 = require("../repositories/RecommendationRepository");
const WebSocketHub_1 = require("../realtime/WebSocketHub");
const UpdateLocationDTO = zod_1.z.object({
    userId: zod_1.z.number().int().positive(),
    latitude: zod_1.z.number().gte(-90).lte(90),
    longitude: zod_1.z.number().gte(-180).lte(180),
});
class LocationController extends BaseController_1.BaseController {
    constructor() {
        super(...arguments);
        this.users = new UserRepository_1.UserRepository(DatabaseService_1.DatabaseService.get());
        this.update = this.handler(async (req, res) => {
            const parsed = UpdateLocationDTO.safeParse(req.body);
            if (!parsed.success)
                return this.fail(res, parsed.error.message, 400);
            const { userId, latitude, longitude } = parsed.data;
            const authUserId = Number(res.locals.userId);
            if (!Number.isFinite(authUserId) || authUserId !== userId) {
                return this.fail(res, "Forbidden", 403);
            }
            const updated = await this.users.updateLocation(userId, latitude, longitude);
            // Invalidate queued recommendations and notify client to refresh
            try {
                const rec = new RecommendationRepository_1.RecommendationRepository(DatabaseService_1.DatabaseService.get());
                await rec.clearForUser(userId);
            }
            catch { }
            try {
                WebSocketHub_1.WebSocketHub.get().sendToUser(userId, "discover:refresh", { changed: ["location"] });
            }
            catch { }
            return this.ok(res, { id: updated.id, latitude: updated.latitude, longitude: updated.longitude, last_seen: updated.last_seen });
        });
    }
}
exports.LocationController = LocationController;
