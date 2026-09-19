import { z } from "zod";

export const ticketStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
]);

export const createTicketSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  status: ticketStatusSchema,
  assignedUserId: z.number().int().positive().optional(),
});

export const updateTicketSchema = z.object({
  status: ticketStatusSchema,
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;