import type { Request, Response } from "express";

import {
  getTickets,
  createNewTicket,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketHistory,
} from "../services/ticket.service.js";

import { isTicketStatus } from "../utils/ticket.js";
// GET /tickets
export const getTicketsController = async (
  req: Request,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  const assignedUserId = req.query.assignedUserId
    ? Number(req.query.assignedUserId)
    : undefined;

  const status = req.query.status
    ? String(req.query.status)
    : undefined;

  if (
    assignedUserId !== undefined &&
    !Number.isInteger(assignedUserId)
  ) {
    return res.status(400).json({
      message: "Invalid assignedUserId",
    });
  }

  if (
    status !== undefined &&
    !isTicketStatus(status)
  ) {
    return res.status(400).json({
      message: "Invalid ticket status",
    });
  }

  const tickets = await getTickets(
    organizationId,
    assignedUserId,
    status,
  );

  return res.json(tickets);
};


// POST /tickets
export const createTicketController = async (
  req: Request,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  const ticket = await createNewTicket(
    organizationId,
    {
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      assignedUserId: req.body.assignedUserId,
    },
  );

  return res.status(201).json(ticket);
};


// GET /tickets/:_id
export const getTicketByIdController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  // Temporary until authentication
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
  // Temporary until authentication
  const organizationId = 1;
  const userId = 1;

  const ticketId = Number(req.params._id);

  if (!Number.isInteger(ticketId)) {
    return res.status(400).json({
      message: "Invalid ticket ID",
    });
  }

  const { status } = req.body;

  const updatedTicket = await updateTicket(
    organizationId,
    userId,
    ticketId,
    status,
  );

  return res.json(updatedTicket);
};


// DELETE /tickets/:_id
export const deleteTicketController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  // Temporary until authentication
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
  // Temporary until authentication
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