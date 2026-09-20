import type { Request, Response } from "express";

import {
  getTickets,
  createNewTicket,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketHistory,
} from "../services/ticket.service.js";

import { ValidationError } from "../errors/validation.error.js";

import {
  createTicketSchema,
  updateTicketSchema,
  ticketQuerySchema,
} from "../schemas/ticket.schema.js";


// GET /tickets
export const getTicketsController = async (
  req: Request,
  res: Response,
) => {
  const organizationId = 1;

  const parsed = ticketQuerySchema.safeParse(
    req.query,
  );

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues
        .map((issue) => issue.message)
        .join(", "),
    );
  }

  const tickets = await getTickets(
    organizationId,
    parsed.data.assignedUserId,
    parsed.data.status,
  );

  return res.json(tickets);
};


// POST /tickets
export const createTicketController = async (
  req: Request,
  res: Response,
) => {
  const organizationId = 1;
  const userId = 1;

  const parsed = createTicketSchema.safeParse(
    req.body,
  );

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues
        .map((issue) => issue.message)
        .join(", "),
    );
  }

  const ticket = await createNewTicket(
    organizationId,
    userId,
    parsed.data,
  );

  return res.status(201).json(ticket);
};


// GET /tickets/:_id
export const getTicketByIdController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const organizationId = 1;

  const ticketId = Number(req.params._id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({
      message: "Invalid ticket ID",
    });
  }

  const ticket = await getTicketById(
    organizationId,
    ticketId,
  );

  return res.json(ticket);
};


// PATCH /tickets/:_id
export const updateTicketController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const organizationId = 1;
  const userId = 1;

  const ticketId = Number(req.params._id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({
      message: "Invalid ticket ID",
    });
  }

  const parsed = updateTicketSchema.safeParse(
    req.body,
  );

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues
        .map((issue) => issue.message)
        .join(", "),
    );
  }

  const updatedTicket = await updateTicket(
    organizationId,
    userId,
    ticketId,
    parsed.data.status,
  );

  return res.json(updatedTicket);
};


// DELETE /tickets/:_id
export const deleteTicketController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const organizationId = 1;
  const userId = 1;

  const ticketId = Number(req.params._id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({
      message: "Invalid ticket ID",
    });
  }

  await deleteTicket(
    organizationId,
    ticketId,
    userId,
  );

  return res.json({
    message: "Ticket deleted successfully",
  });
};


// GET /tickets/:_id/history
export const getTicketHistoryController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const organizationId = 1;

  const ticketId = Number(req.params._id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({
      message: "Invalid ticket ID",
    });
  }

  const history = await getTicketHistory(
    organizationId,
    ticketId,
  );

  return res.json(history);
};