import { db } from "../prisma/db.js";

type TransactionClient =
  Parameters<Parameters<typeof db.transaction>[0]>[0];

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



export const findTicketById = async (ticketId: number) => {
  return db.orm.public.Ticket
    .where({
      id: ticketId,
      deletedAt: null,
    })
    .first();
};

export const updateTicketStatus = async (
  tx: TransactionClient,
  ticketId: number,
  status: string,
) => {
  return tx.orm.public.Ticket
    .where({
      id: ticketId,
    })
    .update({
      status,
    });
};