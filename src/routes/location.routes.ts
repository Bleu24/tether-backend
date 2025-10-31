import { Router } from "express";
import { LocationController } from "../controllers/LocationController";

export function locationRouter(): Router {
  const router = Router();
  const controller = new LocationController();

  // POST /api/update-location
  router.post("/", controller.update);

  return router;
}
