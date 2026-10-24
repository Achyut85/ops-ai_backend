import type { Request, Response } from "express";

import {
  getTickets,
  getTicketsAssignedToUser,
  createNewTicket,
  getTicketById,
  updateTicket,
  updateTicketAssignmentForOrganization,
  deleteTicket,
  getTicketHistory,
} from "../services/ticket.service.js";

import { ValidationError } from "../errors/validation.error.js";

import {
  createTicketSchema,
  updateTicketAssignmentSchema,
  updateTicketSchema,
  ticketQuerySchema,
} from "../schemas/ticket.schema.js";

export const getMyTicketsController = async (
  req: Request,
  res: Response,
) => {
  const { organizationId, sub } = req.auth!;
  const tickets = await getTicketsAssignedToUser(
    organizationId,
    Number(sub),
  );

  return res.json(tickets);
};

// GET /tickets
export const getTicketsController = async (
  req: Request,
  res: Response,
) => {
  const organizationId = req.auth!.organizationId;

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
  const { organizationId, sub, actorType } = req.auth!;

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
    Number(sub),
    actorType,
    parsed.data,
  );

  return res.status(201).json(ticket);
};


// GET /tickets/:_id
export const getTicketByIdController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const organizationId = req.auth!.organizationId;

  const ticketId = Number(req.params._id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({
      message: "Invalid ticket ID",
    });
  }

  const ticket = await getTicketById(
    organizationId,
    ticketId,
    Number(req.auth!.sub),
    req.auth!.actorType,
  );

  return res.json(ticket);
};


// PATCH /tickets/:_id
export const updateTicketController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const { organizationId, sub, actorType } = req.auth!;

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
    Number(sub),
    actorType,
    ticketId,
    parsed.data.status,
  );

  return res.json(updatedTicket);
};

export const updateTicketAssignmentController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const { organizationId, sub } = req.auth!;
  const ticketId = Number(req.params._id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({
      message: "Invalid ticket ID",
    });
  }

  const parsed = updateTicketAssignmentSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  const ticket = await updateTicketAssignmentForOrganization(
    organizationId,
    Number(sub),
    ticketId,
    parsed.data.assignedUserId,
  );

  return res.json(ticket);
};


// DELETE /tickets/:_id
export const deleteTicketController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const { organizationId, sub, actorType } = req.auth!;

  const ticketId = Number(req.params._id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({
      message: "Invalid ticket ID",
    });
  }

  await deleteTicket(
    organizationId,
    ticketId,
    Number(sub),
    actorType,
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
  const organizationId = req.auth!.organizationId;

  const ticketId = Number(req.params._id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({
      message: "Invalid ticket ID",
    });
  }

  const history = await getTicketHistory(
    organizationId,
    ticketId,
    Number(req.auth!.sub),
    req.auth!.actorType,
  );

  return res.json(history);
};