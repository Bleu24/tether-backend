"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoostService = void 0;
const zod_1 = require("zod");
const DatabaseService_1 = require("./DatabaseService");
const BoostRepository_1 = require("../repositories/BoostRepository");
const UserRepository_1 = require("../repositories/UserRepository");
const BoostDTO = zod_1.z.object({ userId: zod_1.z.number().int().positive(), minutes: zod_1.z.number().int().positive().max(120).optional() });
class BoostService {
    constructor() {
        this.repo = new BoostRepository_1.BoostRepository(DatabaseService_1.DatabaseService.get());
        this.users = new UserRepository_1.UserRepository(DatabaseService_1.DatabaseService.get());
    }
    async canActivateBoost(userId) {
        await this.repo.deactivateExpired();
        const user = await this.users.findById(userId);
        if (!user)
            return { canActivate: false };
        const active = await this.repo.hasActive(userId);
        if (active)
            return { canActivate: false };
        const tier = user.subscription_tier || 'free';
        if (tier === 'premium') {
            // Premium: unlimited usage with 12h cooldown, 30m duration
            const last = await this.repo.lastActivation(userId);
            if (!last)
                return { canActivate: true, remaining: null, window: "cooldown" };
            const lastEnd = new Date(last.end_time);
            const next = new Date(lastEnd.getTime() + 12 * 60 * 60 * 1000);
            if (Date.now() < next.getTime())
                return { canActivate: false, nextAvailableAt: next.toISOString(), remaining: null, window: "cooldown" };
            return { canActivate: true, remaining: null, window: "cooldown" };
        }
        if (tier === 'gold') {
            // Gold: 1 boost per fixed window; windows reset at 12:00 and 18:00 server local time
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth();
            const d = now.getDate();
            const noon = new Date(y, m, d, 12, 0, 0);
            const six = new Date(y, m, d, 18, 0, 0);
            let windowStart;
            let nextReset;
            if (now < noon) {
                windowStart = new Date(y, m, d - 1, 18, 0, 0);
                nextReset = noon;
            }
            else if (now < six) {
                windowStart = noon;
                nextReset = six;
            }
            else {
                windowStart = six;
                nextReset = new Date(y, m, d + 1, 12, 0, 0);
            }
            const since = windowStart.toISOString().slice(0, 19).replace('T', ' ');
            const count = await this.repo.countSince(userId, since);
            if (count >= 1) {
                return { canActivate: false, nextAvailableAt: nextReset.toISOString(), remaining: 0, window: "windowed" };
            }
            return { canActivate: true, remaining: 1, window: "windowed" };
        }
        // Free/Plus: no boosts
        return { canActivate: false, remaining: 0 };
    }
    async activate(input) {
        const dto = BoostDTO.parse(input);
        const check = await this.canActivateBoost(dto.userId);
        if (!check.canActivate)
            throw new Error("Boost limit reached");
        const boost = await this.repo.activate(dto.userId, dto.minutes ?? 30);
        return { ok: true, start_time: boost.start_time, end_time: boost.end_time };
    }
    async getStatus(userId) {
        await this.repo.deactivateExpired();
        const active = await this.repo.hasActive(userId);
        if (active) {
            const last = await this.repo.lastActivation(userId);
            return { isActive: true, endsAt: last?.end_time ?? undefined, canActivate: false };
        }
        const can = await this.canActivateBoost(userId);
        return {
            isActive: false,
            canActivate: can.canActivate,
            nextAvailableAt: can.nextAvailableAt,
            remaining: can.remaining,
            window: can.window,
        };
    }
}
exports.BoostService = BoostService;
