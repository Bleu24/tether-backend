import { Message } from "../models/Messages";

export interface IMessageEventPublisher {
  messageCreated(message: Message): void | Promise<void>;
  messageUpdated(message: Message): void | Promise<void>;
  messageDeleted(
    id: number,
    matchId: number,
    scope: "self" | "everyone",
    requesterId: number
  ): void | Promise<void>;
  messageSeen(id: number, matchId: number, seenBy: number): void | Promise<void>;
}
