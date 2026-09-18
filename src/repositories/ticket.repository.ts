import { db } from "../prisma/db.js";
import type { CreateTicketHistoryInput, CreateTicketRepositoryInput, TicketHistoryAction, TicketStatus } from "../types/ticket.types.js";
type TransactionClient =
  Parameters<Parameters<typeof db.transaction>[0]>[0];


export const findTickets = async (
  organizationId: number,
  assignedUserId?: number,
  status?: TicketStatus,
) => {
  return db.orm.public.Ticket
    .where({
      organizationId,
      deletedAt: null,
      ...(assignedUserId !== undefined && {
        assignedUserId,
      }),
      ...(status !== undefined && {
        status,
      }),
    })
    .all();
};


export const findTicketById = async (
  organizationId: number,
  ticketId: number,
) => {
  return db.orm.public.Ticket
    .where({
      id: ticketId,
      organizationId,
      deletedAt: null,
    })
    .first();
};

// POST /tickets
export const createTicket = async (
  data: CreateTicketRepositoryInput,
) => {
  return db.orm.public.Ticket.create({
    title: data.title,
    description: data.description ?? null,
    status: data.status,
    organizationId: data.organizationId,
    assignedUserId: data.assignedUserId ?? null,
  });
};


// PATCH /tickets/:id
// Find ticket inside transaction
export const findTicketByIdTx = async (
  tx: TransactionClient,
  organizationId: number,
  ticketId: number,
) => {
  return tx.orm.public.Ticket
    .where({
      id: ticketId,
      organizationId,
      deletedAt: null,
    })
    .first();
};

// PATCH /tickets/:id
// Update ticket status inside transaction
export const updateTicketStatus = async (
  tx: TransactionClient,
  organizationId: number,
  ticketId: number,
  status: TicketStatus,
) => {
  return tx.orm.public.Ticket
    .where({
      id: ticketId,
      organizationId,
      deletedAt: null,
    })
    .update({
      status,
    });
};


// PATCH /tickets/:id
// Create history inside transaction
export const createTicketHistory = async (
  tx: TransactionClient,
  data: CreateTicketHistoryInput
) => {
  return tx.orm.public.TicketHistory.create({
    organizationId: data.organizationId,
    ticketId: data.ticketId,
    userId: data.userId,
    action: data.action,
    oldStatus: data.oldStatus ?? null,
    newStatus: data.newStatus ?? null,
  });
};
// DELETE /tickets/:id
export const softDeleteTicket = async (
  tx: TransactionClient,
  organizationId: number,
  ticketId: number,
) => {
  return tx.orm.public.Ticket
    .where({
      id: ticketId,
      organizationId,
      deletedAt: null,
    })
    .update({
      deletedAt: new Date().toISOString(),
    });
};

export const findTicketHistory = async (
  organizationId: number,
  ticketId: number,
) => {
  return db.orm.public.TicketHistory
    .where({
      organizationId,
      ticketId,
    })
    .all();
};