import { Router } from "express";
import { requireUser } from "../middleware/auth";
import { MeService } from "../services/MeService";
import { MeController } from "../controllers/MeController";

export function meRouter(): Router {
  const router = Router();
  const service = new MeService();
  const controller = new MeController(service);

  router.use(requireUser);
  router.get("/", controller.profile);
  router.get("/matches", controller.matches);
  router.get("/conversations", controller.conversations);
  router.get("/discover", controller.discover);

  return router;
}
