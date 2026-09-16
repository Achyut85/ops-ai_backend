import { Router } from "express";

import {
  createUserController,
  getCurrentUserController,
  getUserByIdController,
  getUsersController,
  updateCurrentUserController,
  updateUserController,
  updateUserStatusController,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/", getUsersController);
router.get("/me", getCurrentUserController);
router.get("/:_id", getUserByIdController);
router.post("/", createUserController);
router.patch("/me", updateCurrentUserController);
router.patch("/:_id", updateUserController);
router.patch("/:_id/status", updateUserStatusController);

export default router;