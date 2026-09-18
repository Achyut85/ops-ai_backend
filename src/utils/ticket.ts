import type { TicketStatus } from "../types/ticket.types.js";

export const isTicketStatus = (
  status: string,
): status is TicketStatus => {
  return [
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
  ].includes(status as TicketStatus);
};