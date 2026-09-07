import { findTickets ,   createTicket, findTicketById, } from "../repositories/ticket.repository.js";

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



