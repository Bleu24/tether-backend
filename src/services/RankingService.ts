import { MeService } from "./MeService";

/**
 * Recompute and persist recommendation ordering for a user based on current weights.
 * Delegates to MeService.getDiscover which reconciles and reprioritizes the queue.
 */
export async function updateRankingWeights(userId: number): Promise<void> {
  const svc = new MeService();
  try {
    await svc.getDiscover(userId);
  } catch {
    // best-effort; ignore errors
  }
}
