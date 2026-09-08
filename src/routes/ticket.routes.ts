import { Router } from "express";

import {
  getTicketsController,
  createTicketController,
  getTicketByIdController,
  updateTicketController,
  deleteTicketController,
  getTicketHistoryController,
} from "../controllers/ticket.controller.js";

const router = Router();

router.get("/", getTicketsController);

router.get("/:_id", getTicketByIdController);

router.post("/", createTicketController);

router.patch("/:_id", updateTicketController);

router.delete("/:_id", deleteTicketController);

router.get("/:_id/history", getTicketHistoryController);

export default router;