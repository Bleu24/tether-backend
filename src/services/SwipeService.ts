import { z } from "zod";
import { ISwipeRepository } from "../repositories/SwipeRepository";
import { RejectionRepository } from "../repositories/RejectionRepository";
import { DatabaseService } from "./DatabaseService";
import { RecommendationRepository } from "../repositories/RecommendationRepository";
import { Swipe } from "../models/Swipe";

const SwipeDTO = z.object({
    swiperId: z.number().int().positive(),
    targetId: z.number().int().positive(),
    direction: z.enum(["like", "pass"]),
}).refine(v => v.swiperId !== v.targetId, { message: "Cannot swipe on yourself", path: ["targetId"] });

export class SwipeService {
    constructor(
        private readonly repo: ISwipeRepository,
        private readonly rejections = new RejectionRepository(DatabaseService.get()),
        private readonly recQueue = new RecommendationRepository(DatabaseService.get())
    ) { }

    async record(input: unknown): Promise<Swipe> {
        const dto = SwipeDTO.parse(input);
        const swipe = await this.repo.createOrUpdate(dto.swiperId, dto.targetId, dto.direction);
        if (dto.direction === "pass") {
            // Log into rejections for potential undo in the future
            try {
                await this.rejections.add(dto.swiperId, dto.targetId);
            } catch (e) {
                // non-fatal
            }
        }
        // Mark from recommendation queue as consumed to avoid re-serving on reload
        try { await this.recQueue.markConsumed(dto.swiperId, dto.targetId); } catch {}
        return swipe;
    }

    async listBySwiper(swiperId: number, limit?: number): Promise<Swipe[]> {
        return this.repo.listBySwiper(swiperId, limit);
    }
}
