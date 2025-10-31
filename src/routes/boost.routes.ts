import { Router } from "express";
import { BoostService } from "../services/BoostService";
import { BoostController } from "../controllers/BoostController";
import { requireUser } from "../middleware/auth";

export function boostRouter(): Router {
  const router = Router();
  const controller = new BoostController(new BoostService());
  router.use(requireUser);
  router.get("/can", controller.can);
  router.get("/active", controller.activeFor);
  router.post("/", controller.activate);
  return router;
}
