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

export const getTickets = async (
  organizationId: number,
  assignedUserId?: number,
  status?: string,
) => {
  return findTickets(
    organizationId,
    assignedUserId,
    status,
  );
};

export const createNewTicket = async (data: {
  title: string;
  description?: string;
  status: string;
  organizationId: number;
  assignedUserId?: number;
}) => {
  return createTicket(data);
};

export const getTicketById = async (ticketId: number) => {
  return findTicketById(ticketId);
};

export const updateTicket = async (
  ticketId: number,
  status: string,
) => {
  const validStatuses = [
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
  ];

  if (!validStatuses.includes(status)) {
    return "INVALID_STATUS";
  }

  return db.transaction(async (tx) => {
    const ticket = await findTicketByIdTx(tx, ticketId);

    if (!ticket) {
      return null;
    }

    if (ticket.status === status) {
      return "SAME_STATUS";
    }

    const updatedTicket = await updateTicketStatus(
      tx,
      ticketId,
      status,
    );

    if (!updatedTicket) {
      throw new Error("Ticket update failed");
    }

    await createTicketHistory(
      tx,
      updatedTicket.id,
      1,
      updatedTicket.status,
    );

    return updatedTicket;
  });
};

export const deleteTicket = async (ticketId: number) => {
  return softDeleteTicket(ticketId);
};


export const getTicketHistory = async (
  ticketId: number,
) => {
  return findTicketHistory(ticketId);
};