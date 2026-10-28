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
  findTicketsAssignedToUser,
  findTicketForHistory,
  updateTicketAssignment,
} from "../repositories/ticket.repository.js";

import { findUserById } from "../repositories/user.repository.js";

import {
  ticketStatusSchema,
  type TicketStatus,
  type CreateTicketInput,
  type TicketPaginationQuery,
} from "../schemas/ticket.schema.js";

import { NotFoundError } from "../errors/not-found.error.js";
import { ConflictError } from "../errors/conflict.error.js";
import { ValidationError } from "../errors/validation.error.js";
import type { ActorType } from "../types/auth.types.js";


// GET /tickets
export const getTickets = async (
  organizationId: number,
  assignedUserId?: number,
  status?: TicketStatus,
  pagination?: TicketPaginationQuery,
) => {
  return findTickets(
    organizationId,
    assignedUserId,
    status,
    pagination,
  );
};

export const getTicketsAssignedToUser = async (
  organizationId: number,
  userId: number,
  pagination: TicketPaginationQuery,
) => {
  return findTicketsAssignedToUser(organizationId, userId, pagination);
};


// POST /tickets
export const createNewTicket = async (
  organizationId: number,
  userId: number,
  actorType: ActorType,
  data: CreateTicketInput,
) => {
  if (data.assignedUserId !== undefined) {
    const assignedUser = await findUserById(
      organizationId,
      data.assignedUserId,
    );

    if (!assignedUser) {
      throw new ValidationError(
        "Assigned user does not belong to this organization",
      );
    }
  }

  return db.transaction(async (tx) => {
    const ticket = await createTicket(
      tx,
      {
        ...data,
        organizationId,
      },
    );

    await createTicketHistory(tx, {
      organizationId,
      ticketId: ticket.id,
      actorId: userId,
      actorType,
      action: "CREATED",
      newAssignedUserId: data.assignedUserId ?? null,
    });

    return ticket;
  });
};


// GET /tickets/:_id
export const getTicketById = async (
  organizationId: number,
  ticketId: number,
  actorId: number,
  actorType: ActorType,
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

  if (actorType === "USER" && ticket.assignedUserId !== actorId) {
    throw new NotFoundError("Ticket not found");
  }

  return ticket;
};


// PATCH /tickets/:_id
export const updateTicket = async (
  organizationId: number,
  userId: number,
  actorType: ActorType,
  ticketId: number,
  status: TicketStatus,
) => {
  return db.transaction(async (tx) => {
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

    if (actorType === "USER" && ticket.assignedUserId !== userId) {
      throw new NotFoundError("Ticket not found");
    }

    const oldStatus = ticketStatusSchema.parse(
      ticket.status,
    );

    if (oldStatus === status) {
      throw new ConflictError(
        "Ticket already has this status",
      );
    }

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

    const newStatus = ticketStatusSchema.parse(
      updatedTicket.status,
    );

    await createTicketHistory(tx, {
      organizationId,
      ticketId: updatedTicket.id,
      actorId: userId,
      actorType,
      action: "STATUS_CHANGED",
      oldStatus,
      newStatus,
    });

    return updatedTicket;
  });
};


// DELETE /tickets/:_id
export const deleteTicket = async (
  organizationId: number,
  ticketId: number,
  userId: number,
  actorType: ActorType,
) => {
  return db.transaction(async (tx) => {
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

    const deletedTicket = await softDeleteTicket(
      tx,
      organizationId,
      ticketId,
    );

    if (!deletedTicket) {
      throw new Error(
        "Ticket deletion failed",
      );
    }

    await createTicketHistory(tx, {
      organizationId,
      ticketId,
      actorId: userId,
      actorType,
      action: "DELETED",
    });

    return deletedTicket;
  });
};

export const updateTicketAssignmentForOrganization = async (
  organizationId: number,
  actorId: number,
  ticketId: number,
  assignedUserId: number | null,
) => {
  if (assignedUserId !== null) {
    const assignedUser = await findUserById(organizationId, assignedUserId);

    if (!assignedUser) {
      throw new ValidationError(
        "Assigned user does not belong to this organization",
      );
    }
  }

  return db.transaction(async (tx) => {
    const ticket = await findTicketByIdTx(tx, organizationId, ticketId);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    if (ticket.assignedUserId === assignedUserId) {
      throw new ConflictError("Ticket already has this assignee");
    }

    const updatedTicket = await updateTicketAssignment(
      tx,
      organizationId,
      ticketId,
      assignedUserId,
    );

    if (!updatedTicket) {
      throw new Error("Ticket assignment update failed");
    }

    await createTicketHistory(tx, {
      organizationId,
      ticketId,
      actorId,
      actorType: "ORGANIZATION_ACCOUNT",
      action: assignedUserId === null ? "UNASSIGNED" : "ASSIGNED",
      oldAssignedUserId: ticket.assignedUserId,
      newAssignedUserId: assignedUserId,
    });

    return updatedTicket;
  });
};


// GET /tickets/:_id/history
export const getTicketHistory = async (
  organizationId: number,
  ticketId: number,
  actorId: number,
  actorType: ActorType,
) => {
  const ticket = await findTicketForHistory(organizationId, ticketId);

  if (!ticket || (actorType === "USER" && ticket.assignedUserId !== actorId)) {
    throw new NotFoundError("Ticket not found");
  }

  return findTicketHistory(
    organizationId,
    ticketId,
  );
};