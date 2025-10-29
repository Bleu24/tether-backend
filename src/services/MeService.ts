import { User } from "../models/User";
import { Match } from "../models/Match";
import { DatabaseService } from "./DatabaseService";
import { UserRepository } from "../repositories/UserRepository";
import { MatchRepository } from "../repositories/MatchRepository";
import { MessageRepository } from "../repositories/MessageRepository";
import { ProfilePreferenceRepository } from "../repositories/ProfilePreferenceRepository";

export class MeService {
  private users = new UserRepository(DatabaseService.get());
  private matches = new MatchRepository(DatabaseService.get());
  private messages = new MessageRepository(DatabaseService.get());
  private prefs = new ProfilePreferenceRepository(DatabaseService.get());

  async getProfile(userId: number): Promise<User | null> {
    return this.users.findById(userId);
  }

  async getMatches(userId: number): Promise<Match[]> {
    return this.matches.listForUser(userId);
  }

  /**
   * Conversations: list matches for user with latest message and the other participant's user details.
   */
  async getConversations(userId: number): Promise<Array<{ match: Match; latestMessage: any | null; otherUser: User | null }>> {
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
    const me = await this.users.findById(userId);
    if (!me) return [];
    const pref = await this.prefs.getByUserId(userId);
    const all = await this.users.findAll();
    const others = all.filter((u) => u.id !== userId);
    if (!pref) return others;
    // filter by gender preference when set (any => no filter)
    return others.filter((u) => {
      if (!pref.gender_preference || pref.gender_preference === "any") return true;
      return (u.gender ?? undefined) === pref.gender_preference;
    });
  }
}
