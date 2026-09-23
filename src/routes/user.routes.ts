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

import { authenticate } from "../middleware/auth.middleware.js";
import {
  requireOrganizationAccount,
  requireUser,
} from "../middleware/authorization.middleware.js";

const router = Router();

// User only
router.get(
  "/me",
  authenticate,
  requireUser,
  getCurrentUserController,
);

router.patch(
  "/me",
  authenticate,
  requireUser,
  updateCurrentUserController,
);

// Organization account only
router.get(
  "/",
  authenticate,
  requireOrganizationAccount,
  getUsersController,
);

router.get(
  "/:_id",
  authenticate,
  requireOrganizationAccount,
  getUserByIdController,
);

router.post(
  "/",
  authenticate,
  requireOrganizationAccount,
  createUserController,
);

router.patch(
  "/:_id",
  authenticate,
  requireOrganizationAccount,
  updateUserController,
);

router.patch(
  "/:_id/status",
  authenticate,
  requireOrganizationAccount,
  updateUserStatusController,
);

export default router;