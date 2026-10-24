import { Router } from "express";

import {
  getTicketsController,
  getMyTicketsController,
  createTicketController,
  getTicketByIdController,
  updateTicketController,
  updateTicketAssignmentController,
  deleteTicketController,
  getTicketHistoryController,
} from "../controllers/ticket.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  requireOrganizationAccount,
  requireUser,
} from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/me", requireUser, getMyTicketsController);

router.get("/", requireOrganizationAccount, getTicketsController);

router.get("/:_id/history", getTicketHistoryController);

router.get("/:_id", getTicketByIdController);

router.post("/", requireOrganizationAccount, createTicketController);

router.patch(
  "/:_id/assignment",
  requireOrganizationAccount,
  updateTicketAssignmentController,
);

router.patch("/:_id", requireUser, updateTicketController);

router.delete("/:_id", requireOrganizationAccount, deleteTicketController);

export default router;