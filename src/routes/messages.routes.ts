import { Router } from "express";
import { DatabaseService } from "../services/DatabaseService";
import { MessageRepository } from "../repositories/MessageRepository";
import { MatchRepository } from "../repositories/MatchRepository";
import { MessageService } from "../services/MessageService";
import { MessageController } from "../controllers/MessageController";
import { WebSocketMessagePublisher } from "../realtime/WebSocketMessagePublisher";

export function messagesRouter(): Router {
  const router = Router();

  const db = DatabaseService.get();
  const messagesRepo = new MessageRepository(db);
  const matchesRepo = new MatchRepository(db);
  const publisher = WebSocketMessagePublisher.get();
  const service = new MessageService(messagesRepo, matchesRepo, publisher);
  const controller = new MessageController(service);

  router.put("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/seen", controller.markSeen);

  return router;
}
