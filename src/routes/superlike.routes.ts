import { Router } from "express";
import { SuperLikeService } from "../services/SuperLikeService";
import { SuperLikeController } from "../controllers/SuperLikeController";
import { requireUser } from "../middleware/auth";

export function superLikeRouter(): Router {
  const router = Router();
  const controller = new SuperLikeController(new SuperLikeService());
  router.use(requireUser);
  router.get("/can", controller.canUse);
  router.post("/", controller.create);
  return router;
}
