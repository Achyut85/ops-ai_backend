import type { Request, Response } from "express";
import { getTickets , createNewTicket, getTicketById} from "../services/ticket.service.js";

export const getTicketsController = async (
  req: Request,
  res: Response,
) => {
  // Temporary until authentication
  const organizationId = 1;

  const assignedUserId = req.query.assignedUserId
    ? parseInt(req.query.assignedUserId as string)
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

export const getTicketByIdController = async (
  req: Request<{ _id: string }>,
  res: Response,
) => {
  const ticketId = parseInt(req.params._id);

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