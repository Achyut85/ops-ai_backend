import { Router } from "express";

import {
  loginOrganizationController,
  loginUserController,
  logoutAllController,
  logoutController,
  refreshSessionController,
  registerOrganizationController,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { ForbiddenError } from "../errors/forbidden.error.js";

const router = Router();

router.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin) {
    next();
    return;
  }

  const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const requestOrigin = `${req.protocol}://${req.get("host")}`;

  if (origin !== requestOrigin && !allowedOrigins.includes(origin)) {
    throw new ForbiddenError("Origin not allowed");
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

router.post("/register", registerOrganizationController);

router.post("/login", loginOrganizationController);

router.post("/user/login", loginUserController);

router.post("/refresh", refreshSessionController);

router.post("/logout", logoutController);

router.post("/logout-all", authenticate, logoutAllController);

export default router;