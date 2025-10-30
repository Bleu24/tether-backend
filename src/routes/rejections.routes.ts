import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { RejectionService } from "../services/RejectionService";
import { RejectionController } from "../controllers/RejectionController";

export function rejectionsRouter(): Router {
  const router = Router();
  const service = new RejectionService();
  const controller = new RejectionController(service);

  router.use(requireUser);
  router.post("/undo", controller.undo);

  return router;
}
