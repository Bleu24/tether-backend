import { z } from "zod";
import { IMatchRepository } from "../repositories/MatchRepository";
import { Match } from "../models/Match";

const PairDTO = z.object({
    userAId: z.number().int().positive(),
    userBId: z.number().int().positive(),
}).refine(v => v.userAId !== v.userBId, { message: "Users must be different", path: ["userBId"] });

export class MatchService {
    constructor(private readonly repo: IMatchRepository) {}

    async checkOrCreateForPair(input: unknown): Promise<{ matched: boolean; match: Match | null }> {
        const dto = PairDTO.parse(input);
        const match = await this.repo.createIfMutualLike(dto.userAId, dto.userBId);
        // TODO(chat): When a match is created, create a chat thread and initial system message.
        return { matched: Boolean(match), match };
    }

    async listForUser(userId: number): Promise<Match[]> {
        // Ensure any mutual likes that haven't been materialized yet are inserted first
        try {
            await this.repo.createMissingForUser(userId);
        } catch {
            // best-effort reconciliation; proceed to list even if it fails
        }
        return this.repo.listForUser(userId);
    }

    async deactivate(matchId: number): Promise<void> {
        return this.repo.deactivate(matchId);
    }

    /**
     * Public method to allow callers to explicitly reconcile unseen matches for a user.
     * Returns only the matches that were newly created during this call.
     */
    async reconcileUnseenForUser(userId: number): Promise<Match[]> {
        return this.repo.createMissingForUser(userId);
    }

    async listPendingCelebrations(userId: number): Promise<Match[]> {
        // Best-effort reconcile first so pending list is accurate
        try { await this.repo.createMissingForUser(userId); } catch {}
        return this.repo.listPendingCelebrations(userId);
    }

    async markCelebrationShown(matchId: number, userId: number): Promise<void> {
        return this.repo.markCelebrationShown(matchId, userId);
    }
}
