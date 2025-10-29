import { z } from "zod";
import { ISwipeRepository } from "../repositories/SwipeRepository";
import { Swipe } from "../models/Swipe";

const SwipeDTO = z.object({
    swiperId: z.number().int().positive(),
    targetId: z.number().int().positive(),
    direction: z.enum(["like", "pass"]),
}).refine(v => v.swiperId !== v.targetId, { message: "Cannot swipe on yourself", path: ["targetId"] });

export class SwipeService {
    constructor(private readonly repo: ISwipeRepository) { }

    async record(input: unknown): Promise<Swipe> {
        const dto = SwipeDTO.parse(input);
        return this.repo.createOrUpdate(dto.swiperId, dto.targetId, dto.direction);
    }

    async listBySwiper(swiperId: number, limit?: number): Promise<Swipe[]> {
        return this.repo.listBySwiper(swiperId, limit);
    }
}
