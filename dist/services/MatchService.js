"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchService = void 0;
const zod_1 = require("zod");
const PairDTO = zod_1.z.object({
    userAId: zod_1.z.number().int().positive(),
    userBId: zod_1.z.number().int().positive(),
}).refine(v => v.userAId !== v.userBId, { message: "Users must be different", path: ["userBId"] });
class MatchService {
    constructor(repo) {
        this.repo = repo;
    }
    async checkOrCreateForPair(input) {
        const dto = PairDTO.parse(input);
        const match = await this.repo.createIfMutualLike(dto.userAId, dto.userBId);
        // TODO(chat): When a match is created, create a chat thread and initial system message.
        return { matched: Boolean(match), match };
    }
    async listForUser(userId) {
        // Ensure any mutual likes that haven't been materialized yet are inserted first
        try {
            await this.repo.createMissingForUser(userId);
        }
        catch {
            // best-effort reconciliation; proceed to list even if it fails
        }
        return this.repo.listForUser(userId);
    }
    async deactivate(matchId) {
        return this.repo.deactivate(matchId);
    }
    /**
     * Public method to allow callers to explicitly reconcile unseen matches for a user.
     * Returns only the matches that were newly created during this call.
     */
    async reconcileUnseenForUser(userId) {
        return this.repo.createMissingForUser(userId);
    }
    async listPendingCelebrations(userId) {
        // Best-effort reconcile first so pending list is accurate
        try {
            await this.repo.createMissingForUser(userId);
        }
        catch { }
        return this.repo.listPendingCelebrations(userId);
    }
    async markCelebrationShown(matchId, userId) {
        return this.repo.markCelebrationShown(matchId, userId);
    }
}
exports.MatchService = MatchService;
