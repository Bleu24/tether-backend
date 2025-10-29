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
        return this.repo.listForUser(userId);
    }

    async deactivate(matchId: number): Promise<void> {
        return this.repo.deactivate(matchId);
    }
}
