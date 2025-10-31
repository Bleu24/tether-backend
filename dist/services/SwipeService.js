"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwipeService = void 0;
const zod_1 = require("zod");
const RejectionRepository_1 = require("../repositories/RejectionRepository");
const DatabaseService_1 = require("./DatabaseService");
const RecommendationRepository_1 = require("../repositories/RecommendationRepository");
const MatchRepository_1 = require("../repositories/MatchRepository");
const WebSocketHub_1 = require("../realtime/WebSocketHub");
const SwipeDTO = zod_1.z.object({
    swiperId: zod_1.z.number().int().positive(),
    targetId: zod_1.z.number().int().positive(),
    direction: zod_1.z.enum(["like", "pass"]),
}).refine(v => v.swiperId !== v.targetId, { message: "Cannot swipe on yourself", path: ["targetId"] });
class SwipeService {
    constructor(repo, rejections = new RejectionRepository_1.RejectionRepository(DatabaseService_1.DatabaseService.get()), recQueue = new RecommendationRepository_1.RecommendationRepository(DatabaseService_1.DatabaseService.get())) {
        this.repo = repo;
        this.rejections = rejections;
        this.recQueue = recQueue;
    }
    async record(input) {
        const dto = SwipeDTO.parse(input);
        const swipe = await this.repo.createOrUpdate(dto.swiperId, dto.targetId, dto.direction);
        if (dto.direction === "pass") {
            // Log into rejections for potential undo in the future
            try {
                await this.rejections.add(dto.swiperId, dto.targetId);
            }
            catch (e) {
                // non-fatal
            }
        }
        // Mark from recommendation queue as consumed to avoid re-serving on reload
        try {
            await this.recQueue.markConsumed(dto.swiperId, dto.targetId);
        }
        catch { }
        // If this was a 'like', check for mutual like and create a match, then notify both users in real-time
        if (dto.direction === "like") {
            try {
                const matchRepo = new MatchRepository_1.MatchRepository(DatabaseService_1.DatabaseService.get());
                const match = await matchRepo.createIfMutualLike(dto.swiperId, dto.targetId);
                const hub = WebSocketHub_1.WebSocketHub.get();
                if (match) {
                    // Broadcast to both users: it's a match!
                    hub.sendToUser(match.user_a_id, "match:created", { matchId: match.id, userAId: match.user_a_id, userBId: match.user_b_id, created_at: match.created_at });
                    hub.sendToUser(match.user_b_id, "match:created", { matchId: match.id, userAId: match.user_a_id, userBId: match.user_b_id, created_at: match.created_at });
                }
                else {
                    // Notify the target user to refresh their likers in real-time
                    hub.sendToUser(dto.targetId, "likers:refresh", { fromUserId: dto.swiperId });
                }
            }
            catch {
                // non-fatal
            }
        }
        return swipe;
    }
    async listBySwiper(swiperId, limit) {
        return this.repo.listBySwiper(swiperId, limit);
    }
}
exports.SwipeService = SwipeService;
