import { db } from "../prisma/db.js";

import {
  findTickets,
  createTicket,
  findTicketById,
  findTicketByIdTx,
  updateTicketStatus,
  createTicketHistory,
  softDeleteTicket,
  findTicketHistory,
} from "../repositories/ticket.repository.js";

import { findUserById } from "../repositories/user.repository.js";

import type { CreateTicketInput } from "../schemas/ticket.schema.ts";
import { ticketStatusSchema } from "../schemas/ticket.schema.js";
type TicketStatus = typeof ticketStatusSchema._output;

import { NotFoundError } from "../errors/not-found.error.js";
import { ConflictError } from "../errors/conflict.error.js";
import { ValidationError } from "../errors/validation.error.js";

import { isTicketStatus } from "../utils/ticket.js";


// GET /tickets
export const getTickets = async (
  organizationId: number,
  assignedUserId?: number,
  status?: TicketStatus,
) => {
  return findTickets(
    organizationId,
    assignedUserId,
    status,
  );
};


// POST /tickets
export const createNewTicket = async (
  organizationId: number,
  userId: number,
  data: CreateTicketInput,
) => {
  if (data.assignedUserId !== undefined) {
    const assignedUser = await findUserById(organizationId, data.assignedUserId);
    if (!assignedUser) {
      throw new ValidationError("Assigned user does not belong to this organization");
    }
  }

  return db.transaction(async (tx) => {
    const ticket = await createTicket(tx, { ...data, organizationId });

    await createTicketHistory(tx, {
      organizationId,
      ticketId: ticket.id,
      userId,
      action: "CREATED",
    });

    return ticket;
  });
};


// GET /tickets/:_id
export const getTicketById = async (
  organizationId: number,
  ticketId: number,
) => {
  const ticket = await findTicketById(
    organizationId,
    ticketId,
  );

  if (!ticket) {
    throw new NotFoundError(
      "Ticket not found",
    );
  }

  return ticket;
};


// PATCH /tickets/:_id
export const updateTicket = async (
  organizationId: number,
  userId: number,
  ticketId: number,
  status: TicketStatus,
) => {
  // Runtime validation.

  return db.transaction(async (tx) => {
    // Find ticket inside the organization.
    const ticket = await findTicketByIdTx(
      tx,
      organizationId,
      ticketId,
    );

    if (!ticket) {
      throw new NotFoundError(
        "Ticket not found",
      );
    }

    // Validate status coming from database.
    if (!isTicketStatus(ticket.status)) {
      throw new Error(
        "Invalid ticket status stored in database",
      );
    }

    // Don't create history if nothing changed.
    if (ticket.status === status) {
      throw new ConflictError(
        "Ticket already has this status",
      );
    }

    // Update ticket.
    const updatedTicket = await updateTicketStatus(
      tx,
      organizationId,
      ticketId,
      status,
    );

    if (!updatedTicket) {
      throw new Error(
        "Ticket update failed",
      );
    }

    // Validate updated status.
    if (!isTicketStatus(updatedTicket.status)) {
      throw new Error(
        "Invalid ticket status returned after update",
      );
    }

    // Create audit history.
    await createTicketHistory(tx, {
      organizationId,
      ticketId: updatedTicket.id,
      userId,
      action: "STATUS_CHANGED",
      oldStatus: ticket.status,
      newStatus: updatedTicket.status,
    });

    return updatedTicket;
  });
};


// DELETE /tickets/:_id
export const deleteTicket = async (
  organizationId: number,
  ticketId: number,
  userId: number,
) => {
  return db.transaction(async (tx) => {
    const ticket = await findTicketByIdTx(tx, organizationId, ticketId);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    const deletedTicket = await softDeleteTicket(tx, organizationId, ticketId);

    if (!deletedTicket) {
      throw new Error("Ticket deletion failed");
    }

    await createTicketHistory(tx, {
      organizationId,
      ticketId,
      userId,
      action: "DELETED",
    });

    return deletedTicket;
  });
};


// GET /tickets/:_id/history
export const getTicketHistory = async (
  organizationId: number,
  ticketId: number,
) => {
  return findTicketHistory(
    organizationId,
    ticketId,
  );
};