import { ticketStatusSchema, type TicketStatus } from "../schemas/ticket.schema.js";

export const isTicketStatus = (
  status: string,
): status is TicketStatus => {
  return ticketStatusSchema.safeParse(status).success;
};