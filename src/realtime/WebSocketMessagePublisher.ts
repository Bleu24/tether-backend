import { IMessageEventPublisher } from "./IMessageEventPublisher";
import { WebSocketHub } from "./WebSocketHub";
import { Message } from "../models/Messages";

export class WebSocketMessagePublisher implements IMessageEventPublisher {
  private static _instance: WebSocketMessagePublisher | null = null;
  static get(): WebSocketMessagePublisher {
    if (!this._instance) this._instance = new WebSocketMessagePublisher();
    return this._instance;
  }

  private hub() {
    return WebSocketHub.get();
  }

  messageCreated(message: Message): void {
    this.hub().broadcastToMatch(message.match_id, "message:created", { message });
  }

  messageUpdated(message: Message): void {
    this.hub().broadcastToMatch(message.match_id, "message:updated", { message });
  }

  messageDeleted(id: number, matchId: number, scope: "self" | "everyone", requesterId: number): void {
    if (scope === "everyone") {
      this.hub().broadcastToMatch(matchId, "message:deleted", { id, matchId, scope });
    } else {
      this.hub().sendToUser(requesterId, "message:deleted", { id, matchId, scope });
    }
  }

  messageSeen(id: number, matchId: number, seenBy: number): void {
    this.hub().broadcastToMatch(matchId, "message:seen", { id, matchId, seenBy });
  }
}
