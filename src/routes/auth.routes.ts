import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

export function authRouter(): Router {
  const router = Router();
  const controller = new AuthController();
  router.post("/signup", controller.signup);
  router.post("/login", controller.login);
  return router;
}
