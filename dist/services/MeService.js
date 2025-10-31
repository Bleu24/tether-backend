"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeService = void 0;
const DatabaseService_1 = require("./DatabaseService");
const UserRepository_1 = require("../repositories/UserRepository");
const MatchRepository_1 = require("../repositories/MatchRepository");
const MessageRepository_1 = require("../repositories/MessageRepository");
const ProfilePreferenceRepository_1 = require("../repositories/ProfilePreferenceRepository");
const SwipeRepository_1 = require("../repositories/SwipeRepository");
const RejectionRepository_1 = require("../repositories/RejectionRepository");
const RecommendationRepository_1 = require("../repositories/RecommendationRepository");
const SuperLikeRepository_1 = require("../repositories/SuperLikeRepository");
const BoostRepository_1 = require("../repositories/BoostRepository");
class MeService {
    constructor() {
        this.users = new UserRepository_1.UserRepository(DatabaseService_1.DatabaseService.get());
        this.matches = new MatchRepository_1.MatchRepository(DatabaseService_1.DatabaseService.get());
        this.messages = new MessageRepository_1.MessageRepository(DatabaseService_1.DatabaseService.get());
        this.prefs = new ProfilePreferenceRepository_1.ProfilePreferenceRepository(DatabaseService_1.DatabaseService.get());
        this.swipes = new SwipeRepository_1.SwipeRepository(DatabaseService_1.DatabaseService.get());
        this.rejections = new RejectionRepository_1.RejectionRepository(DatabaseService_1.DatabaseService.get());
        this.recQueue = new RecommendationRepository_1.RecommendationRepository(DatabaseService_1.DatabaseService.get());
        this.superlikes = new SuperLikeRepository_1.SuperLikeRepository(DatabaseService_1.DatabaseService.get());
        this.boosts = new BoostRepository_1.BoostRepository(DatabaseService_1.DatabaseService.get());
    }
    async getProfile(userId) {
        return this.users.findById(userId);
    }
    async getMatches(userId) {
        // Ensure mutual likes are materialized as matches before returning
        try {
            await this.matches.createMissingForUser(userId);
        }
        catch { }
        return this.matches.listForUser(userId);
    }
    /**
     * Conversations: list matches for user with latest message and the other participant's user details.
     */
    async getConversations(userId) {
        // Reconcile unseen matches so conversations reflect fresh mutual likes
        try {
            await this.matches.createMissingForUser(userId);
        }
        catch { }
        const list = await this.matches.listForUser(userId);
        const results = [];
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
    async getDiscover(userId) {
        // Reconcile first so matched users are excluded from discover
        try {
            await this.matches.createMissingForUser(userId);
        }
        catch { }
        const me = await this.users.findById(userId);
        if (!me)
            return [];
        const pref = await this.prefs.getByUserId(userId);
        const all = await this.users.findAll();
        const others = all.filter((u) => u.id !== userId && !u.is_deleted);
        const allById = new Map(all.map((u) => [u.id, u]));
        // Build exclusion set: users already matched, swiped (like/pass), or actively rejected
        const myMatches = await this.matches.listForUser(userId);
        const matchedIds = new Set(myMatches.map((m) => (m.user_a_id === userId ? m.user_b_id : m.user_a_id)));
        const mySwipes = await this.swipes.listBySwiper(userId, 1000);
        const swipedIds = new Set(mySwipes.map((s) => s.target_id));
        const rejectedIdsArr = await this.rejections.listActiveRejectedIds(userId);
        const rejectedIds = new Set(rejectedIdsArr);
        const excluded = new Set([...matchedIds, ...swipedIds, ...rejectedIds]);
        const basePool = others.filter((u) => !excluded.has(u.id));
        function filterByPref(list) {
            if (!pref || !pref.gender_preference || pref.gender_preference === "any")
                return list;
            return list.filter((u) => (u.gender ?? undefined) === pref.gender_preference);
        }
        // Check existing queued recommendations first
        const QUEUE_TARGET = 20;
        let queuedIds = await this.recQueue.getQueuedTargets(userId, QUEUE_TARGET);
        // If queue is short, top it up from pool
        if (queuedIds.length < QUEUE_TARGET) {
            const need = QUEUE_TARGET - queuedIds.length;
            const queuedSet = new Set(queuedIds);
            // Strictly respect gender preference: filter upfront
            const preferredPool = filterByPref(basePool).filter((u) => !queuedSet.has(u.id));
            // Ranking inputs
            await this.boosts.deactivateExpired();
            const superLikedMe = new Set(await this.superlikes.listSendersTo(userId, 500));
            const iSuperLiked = new Set();
            {
                const { rows } = await DatabaseService_1.DatabaseService.get().query(`SELECT receiver_id FROM super_likes WHERE sender_id = ?`, [userId]);
                rows.forEach((r) => iSuperLiked.add(Number(r.receiver_id)));
            }
            let ordered = [];
            // If we have location and distance preference, use Haversine to prioritize by proximity
            if (me.latitude != null && me.longitude != null && pref && typeof pref.distance === 'number') {
                const nearby = await this.users.findNearbyForDiscover({
                    userId,
                    latitude: Number(me.latitude),
                    longitude: Number(me.longitude),
                    maxRadiusKm: pref.distance,
                    genderPreference: pref.gender_preference,
                    excludeIds: Array.from(excluded),
                    limit: need * 5,
                });
                const distById = new Map(nearby.map(r => [r.id, r.distance_km]));
                const candidateIds = nearby.map(r => r.id);
                const candidateUsers = candidateIds
                    .map(id => allById.get(id))
                    .filter(Boolean);
                const boostedIds = new Set(await this.boosts.listActiveIds(candidateUsers.map(u => u.id)));
                // Partition by priority: boosted or super-likers come first
                const priority = candidateUsers
                    .map(u => ({ u, d: distById.get(u.id) ?? Number.MAX_SAFE_INTEGER, boosted: boostedIds.has(u.id), super: superLikedMe.has(u.id) }))
                    .sort((a, b) => (a.d - b.d));
                const high = priority.filter(x => x.boosted || x.super);
                const normal = priority.filter(x => !x.boosted && !x.super);
                const merged = [...high, ...normal].slice(0, need * 2);
                // Avoid >2 boosted in a row
                const pool = [...merged];
                let boostedRun = 0;
                while (pool.length > 0 && ordered.length < need) {
                    const nextIdx = (() => {
                        if (boostedRun >= 2) {
                            const idx = pool.findIndex(x => !x.boosted);
                            if (idx !== -1)
                                return idx;
                        }
                        return 0;
                    })();
                    const [pick] = pool.splice(nextIdx, 1);
                    ordered.push(pick.u.id);
                    boostedRun = pick.boosted ? boostedRun + 1 : 0;
                }
            }
            else {
                // Fallback: previous affinity-based ranking (no location)
                const boostedIds = new Set(await this.boosts.listActiveIds(preferredPool.map(u => u.id)));
                const myInterests = Array.isArray(pref?.interests) ? pref.interests : [];
                function affinityScore(a) {
                    const otherInterests = Array.isArray(a?.preferences?.interests) ? a.preferences.interests : [];
                    const setA = new Set(otherInterests);
                    let overlap = 0;
                    for (const k of myInterests)
                        if (setA.has(k))
                            overlap++;
                    const denom = Math.max(1, new Set([...myInterests, ...otherInterests]).size);
                    return overlap / denom; // 0..1
                }
                function score(a) {
                    let s = affinityScore(a);
                    const boosted = boostedIds.has(a.id);
                    const aSuperLikedMe = superLikedMe.has(a.id);
                    const mutualSuper = aSuperLikedMe && iSuperLiked.has(a.id);
                    if (boosted)
                        s += 0.3;
                    if (mutualSuper)
                        s += 1.0;
                    else if (aSuperLikedMe)
                        s += 0.5;
                    return s;
                }
                const ranked = preferredPool
                    .map(u => ({ u, s: score(u), boosted: (async () => false) })); // placeholder type
                ranked.forEach(r => { r.boosted = false; });
                ranked.sort((a, b) => b.s - a.s);
                const pool = ranked.slice(0, need);
                // Avoid >2 boosted in a row (rare in fallback since boosted flag isn't computed here)
                let boostedRun = 0;
                while (pool.length > 0 && ordered.length < need) {
                    const pick = pool.shift();
                    ordered.push(pick.u.id);
                    boostedRun = pick.boosted ? boostedRun + 1 : 0;
                }
            }
            await this.recQueue.ensureQueued(userId, ordered);
            // Re-prioritize by adjusting created_at sequence to preserve ordering
            try {
                for (let i = 0; i < ordered.length; i++) {
                    await DatabaseService_1.DatabaseService.get().execute(`UPDATE recommendation_queue SET created_at = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ? SECOND)
             WHERE user_id = ? AND target_id = ? AND status = 'queued'`, [ordered.length - i, userId, ordered[i]]);
                }
            }
            catch { }
            queuedIds = await this.recQueue.getQueuedTargets(userId, QUEUE_TARGET);
        }
        // Map queued ids -> users
        const byId = new Map(others.map((u) => [u.id, u]));
        const users = queuedIds.map((id) => byId.get(id)).filter(Boolean);
        return users;
    }
    /**
     * Likers: users who have swiped 'like' on me but there's no mutual match yet.
     */
    async getLikers(userId) {
        // Reconcile unseen matches first so mutual likes don't appear as mere likers
        try {
            await this.matches.createMissingForUser(userId);
        }
        catch { }
        // Find users who liked me
        const { rows } = await DatabaseService_1.DatabaseService.get().query(`SELECT s.swiper_id AS liker_id
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
       LIMIT 50`, [userId, userId, userId, userId]);
        const ids = rows.map((r) => Number(r.liker_id)).filter((n) => Number.isFinite(n));
        const out = [];
        for (const id of ids) {
            const u = await this.users.findById(id);
            if (u)
                out.push(u);
        }
        return out;
    }
    /**
     * SuperLikers: users who sent me a Super Like.
     */
    async getSuperLikers(userId) {
        const { rows } = await DatabaseService_1.DatabaseService.get().query(`SELECT s.sender_id AS liker_id, MAX(s.created_at) AS last_created
       FROM super_likes s
       WHERE s.receiver_id = ?
       GROUP BY s.sender_id
       ORDER BY last_created DESC
       LIMIT 200`, [userId]);
        const ids = rows.map((r) => Number(r.liker_id)).filter((n) => Number.isFinite(n));
        const out = [];
        for (const id of ids) {
            const u = await this.users.findById(id);
            if (u)
                out.push(u);
        }
        return out;
    }
    /**
     * Pending match celebrations for the current user. Returns Match rows where the user's
     * celebration flag is still unset (0). Best-effort reconciliation is already performed
     * inside MatchRepository methods called by MeService elsewhere.
     */
    async getPendingCelebrations(userId) {
        try {
            await this.matches.createMissingForUser(userId);
        }
        catch { }
        return this.matches.listPendingCelebrations(userId);
    }
    async markCelebrationSeen(matchId, userId) {
        return this.matches.markCelebrationShown(matchId, userId);
    }
}
exports.MeService = MeService;
