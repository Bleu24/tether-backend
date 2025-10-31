"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRankingWeights = updateRankingWeights;
const MeService_1 = require("./MeService");
/**
 * Recompute and persist recommendation ordering for a user based on current weights.
 * Delegates to MeService.getDiscover which reconciles and reprioritizes the queue.
 */
async function updateRankingWeights(userId) {
    const svc = new MeService_1.MeService();
    try {
        await svc.getDiscover(userId);
    }
    catch {
        // best-effort; ignore errors
    }
}
