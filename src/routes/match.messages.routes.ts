import { Router } from "express";
import { DatabaseService } from "../services/DatabaseService";
import { MessageRepository } from "../repositories/MessageRepository";
import { MatchRepository } from "../repositories/MatchRepository";
import { MessageService } from "../services/MessageService";
import { MessageController } from "../controllers/MessageController";
import { WebSocketMessagePublisher } from "../realtime/WebSocketMessagePublisher";

export function matchMessagesRouter(): Router {
  const router = Router({ mergeParams: true });

  const db = DatabaseService.get();
  const messagesRepo = new MessageRepository(db);
  const matchesRepo = new MatchRepository(db);
  const publisher = WebSocketMessagePublisher.get();
  const service = new MessageService(messagesRepo, matchesRepo, publisher);
  const controller = new MessageController(service);

  router.get("/", controller.listForMatch);
  router.post("/", controller.createForMatch);

  return router;
}
