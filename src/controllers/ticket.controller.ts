import type { Request, Response } from "express";

import {
  getTickets,
  createNewTicket,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketHistory,
} from "../services/ticket.service.js";


// GET /tickets
export const getTicketsController = async (
  req: Request,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  const assignedUserId = req.query.assignedUserId
    ? parseInt(req.query.assignedUserId as string, 10)
    : undefined;

  const status = req.query.status as string | undefined;

  if (assignedUserId !== undefined && isNaN(assignedUserId)) {
    return res.status(400).json({
      message: "Invalid assignedUserId",
    });
  }

  try {
    const tickets = await getTickets(
      organizationId,
      assignedUserId,
      status,
    );

    return res.json(tickets);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);

    return res.status(500).json({
      message: "Failed to fetch tickets",
    });
  }
};


// POST /tickets
export const createTicketController = async (
  req: Request,
  res: Response,
) => {
  try {
    const ticket = await createNewTicket({
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      organizationId: req.body.organizationId,
      assignedUserId: req.body.assignedUserId,
    });

    return res.status(201).json(ticket);
  } catch (error) {
    console.error("Failed to create ticket:", error);

    return res.status(500).json({
      message: "Failed to create ticket",
    });
  }
};


// GET /tickets/:id
export const getTicketByIdController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const ticketId = parseInt(req.params._id, 10);

  try {
    const ticket = await getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    return res.json(ticket);
  } catch (error) {
    console.error("Failed to fetch ticket:", error);

    return res.status(500).json({
      message: "Failed to fetch ticket",
    });
  }
};


// PATCH /tickets/:id
export const updateTicketController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const ticketId = parseInt(req.params._id, 10);
  const { status } = req.body;

  try {
    const result = await updateTicket(
      ticketId,
      status,
    );

    if (result === "INVALID_STATUS") {
      return res.status(400).json({
        message: "Invalid ticket status",
      });
    }

    if (result === null) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (result === "SAME_STATUS") {
      return res.status(400).json({
        message: "Ticket is already in this status",
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("Transaction failed:", error);

    return res.status(500).json({
      message: "Failed to update ticket",
    });
  }
};


// DELETE /tickets/:id
export const deleteTicketController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const ticketId = parseInt(req.params._id, 10);

  try {
    const deletedTicket = await deleteTicket(ticketId);

    if (!deletedTicket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    return res.json({
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete ticket:", error);

    return res.status(500).json({
      message: "Failed to delete ticket",
    });
  }
};


export const getTicketHistoryController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const ticketId = parseInt(req.params._id, 10);

  try {
    const history = await getTicketHistory(ticketId);

    return res.json(history);
  } catch (error) {
    console.error("Failed to fetch ticket history:", error);

    return res.status(500).json({
      message: "Failed to fetch ticket history",
    });
  }
};