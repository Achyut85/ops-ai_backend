import { db } from "../prisma/db.js";

type TransactionClient =
  Parameters<Parameters<typeof db.transaction>[0]>[0];


// GET /tickets
export const findTickets = async (
  organizationId: number,
  assignedUserId?: number,
  status?: string,
) => {
  return db.orm.public.Ticket
    .where({
      organizationId,
      deletedAt: null,
      ...(assignedUserId !== undefined && { assignedUserId }),
      ...(status !== undefined && { status }),
    })
    .all();
};


// GET /tickets/:id
export const findTicketById = async (
  ticketId: number,
) => {
  return db.orm.public.Ticket
    .where({
      id: ticketId,
      deletedAt: null,
    })
    .first();
};


// POST /tickets
export const createTicket = async (data: {
  title: string;
  description?: string;
  status: string;
  organizationId: number;
  assignedUserId?: number;
}) => {
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
  ticketId: number,
) => {
  return tx.orm.public.Ticket
    .where({
      id: ticketId,
      deletedAt: null,
    })
    .first();
};


// PATCH /tickets/:id
// Update ticket status inside transaction
export const updateTicketStatus = async (
  tx: TransactionClient,
  ticketId: number,
  status: string,
) => {
  return tx.orm.public.Ticket
    .where({
      id: ticketId,
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
  ticketId: number,
  userId: number,
  status: string,
) => {
  return tx.orm.public.TicketHistory.create({
    ticketId,
    userId,
    status,
  });
};


// DELETE /tickets/:id
export const softDeleteTicket = async (
  ticketId: number,
) => {
  return db.orm.public.Ticket
    .where({
      id: ticketId,
      deletedAt: null,
    })
    .update({
      deletedAt: new Date().toISOString(),
    });
};


export const findTicketHistory = async (
  ticketId: number,
) => {
  return db.orm.public.TicketHistory
    .where({
      ticketId,
    })
    .all();
};