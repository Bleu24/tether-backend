import { User } from "../models/User";
import { Match } from "../models/Match";
import { DatabaseService } from "./DatabaseService";
import { UserRepository } from "../repositories/UserRepository";
import { MatchRepository } from "../repositories/MatchRepository";
import { MessageRepository } from "../repositories/MessageRepository";
import { ProfilePreferenceRepository } from "../repositories/ProfilePreferenceRepository";
import { SwipeRepository } from "../repositories/SwipeRepository";
import { RejectionRepository } from "../repositories/RejectionRepository";
import { RecommendationRepository } from "../repositories/RecommendationRepository";

export class MeService {
  private users = new UserRepository(DatabaseService.get());
  private matches = new MatchRepository(DatabaseService.get());
  private messages = new MessageRepository(DatabaseService.get());
  private prefs = new ProfilePreferenceRepository(DatabaseService.get());
  private swipes = new SwipeRepository(DatabaseService.get());
  private rejections = new RejectionRepository(DatabaseService.get());
  private recQueue = new RecommendationRepository(DatabaseService.get());

  async getProfile(userId: number): Promise<User | null> {
    return this.users.findById(userId);
  }

  async getMatches(userId: number): Promise<Match[]> {
    // Ensure mutual likes are materialized as matches before returning
    try { await this.matches.createMissingForUser(userId); } catch {}
    return this.matches.listForUser(userId);
  }

  /**
   * Conversations: list matches for user with latest message and the other participant's user details.
   */
  async getConversations(userId: number): Promise<Array<{ match: Match; latestMessage: any | null; otherUser: User | null }>> {
    // Reconcile unseen matches so conversations reflect fresh mutual likes
    try { await this.matches.createMissingForUser(userId); } catch {}
    const list = await this.matches.listForUser(userId);
    const results: Array<{ match: Match; latestMessage: any | null; otherUser: User | null }> = [];
    for (const m of list) {
      const latest = await this.messages.getLatestForMatch(m.id, userId);
      const otherId = m.user_a_id === userId ? m.user_b_id : m.user_a_id;
      const other = await this.users.findById(otherId);
      results.push({ match: m, latestMessage: latest, otherUser: other });
    }
    return results;
  }

  /**
   * Discover: naive recommendations based on gender_preference; excludes current user.
   * Note: Users do not have age or geo fields to filter by min/max age or distance yet.
   */
  async getDiscover(userId: number): Promise<User[]> {
    // Reconcile first so matched users are excluded from discover
    try { await this.matches.createMissingForUser(userId); } catch {}
    const me = await this.users.findById(userId);
    if (!me) return [];
    const pref = await this.prefs.getByUserId(userId);
    const all = await this.users.findAll();
    const others = all.filter((u) => u.id !== userId);

    // Build exclusion set: users already matched, swiped (like/pass), or actively rejected
    const myMatches = await this.matches.listForUser(userId);
    const matchedIds = new Set<number>(myMatches.map((m) => (m.user_a_id === userId ? m.user_b_id : m.user_a_id)));
    const mySwipes = await this.swipes.listBySwiper(userId, 1000);
    const swipedIds = new Set<number>(mySwipes.map((s) => s.target_id));
    const rejectedIdsArr = await this.rejections.listActiveRejectedIds(userId);
    const rejectedIds = new Set<number>(rejectedIdsArr);
    const excluded = new Set<number>([...matchedIds, ...swipedIds, ...rejectedIds]);

    const basePool = others.filter((u) => !excluded.has(u.id));

    function filterByPref(list: User[]): User[] {
      if (!pref || !pref.gender_preference || pref.gender_preference === "any") return list;
      return list.filter((u) => (u.gender ?? undefined) === pref.gender_preference);
    }

    // Check existing queued recommendations first
    const QUEUE_TARGET = 20;
    let queuedIds = await this.recQueue.getQueuedTargets(userId, QUEUE_TARGET);

    // If queue is short, top it up from pool
    if (queuedIds.length < QUEUE_TARGET) {
      const need = QUEUE_TARGET - queuedIds.length;
      const queuedSet = new Set<number>(queuedIds);
      // Prefer filtered by preference; then relax if still short
      const preferred = filterByPref(basePool).filter((u) => !queuedSet.has(u.id));
      const relaxed = basePool.filter((u) => !queuedSet.has(u.id));
      const pick: number[] = [];
      for (const u of preferred) {
        if (pick.length >= need) break; pick.push(u.id);
      }
      if (pick.length < need) {
        for (const u of relaxed) {
          if (pick.length >= need) break;
          if (!preferred.find((p) => p.id === u.id)) pick.push(u.id);
        }
      }
      await this.recQueue.ensureQueued(userId, pick);
      queuedIds = await this.recQueue.getQueuedTargets(userId, QUEUE_TARGET);
    }

    // Map queued ids -> users
    const byId = new Map<number, User>(others.map((u) => [u.id, u] as const));
    const users = queuedIds.map((id) => byId.get(id)).filter(Boolean) as User[];
    return users;
  }

  /**
   * Likers: users who have swiped 'like' on me but there's no mutual match yet.
   */
  async getLikers(userId: number): Promise<User[]> {
    // Reconcile unseen matches first so mutual likes don't appear as mere likers
    try { await this.matches.createMissingForUser(userId); } catch {}
    // Find users who liked me
    const { rows } = await DatabaseService.get().query<any>(
      `SELECT s.swiper_id AS liker_id
       FROM swipes s
       WHERE s.target_id = ? AND s.direction = 'like'
         AND NOT EXISTS (
           SELECT 1 FROM swipes s2
           WHERE s2.swiper_id = ? AND s2.target_id = s.swiper_id AND s2.direction = 'like'
         )
         AND NOT EXISTS (
           SELECT 1 FROM matches m
           WHERE m.user_a_id = LEAST(?, s.swiper_id)
             AND m.user_b_id = GREATEST(?, s.swiper_id)
             AND m.is_active = 1
         )
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [userId, userId, userId, userId]
    );
    const ids: number[] = rows.map((r: any) => Number(r.liker_id)).filter((n: any) => Number.isFinite(n));
    const out: User[] = [];
    for (const id of ids) {
      const u = await this.users.findById(id);
      if (u) out.push(u);
    }
    return out;
  }

  /**
   * Pending match celebrations for the current user. Returns Match rows where the user's
   * celebration flag is still unset (0). Best-effort reconciliation is already performed
   * inside MatchRepository methods called by MeService elsewhere.
   */
  async getPendingCelebrations(userId: number): Promise<Match[]> {
    try { await this.matches.createMissingForUser(userId); } catch {}
    return this.matches.listPendingCelebrations(userId);
  }

  async markCelebrationSeen(matchId: number, userId: number): Promise<void> {
    return this.matches.markCelebrationShown(matchId, userId);
  }
}
