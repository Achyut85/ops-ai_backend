import { z } from "zod";

export const ticketStatusSchema = z.enum(
  [
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
  ],
  {
    error: "Invalid ticket status",
  },
);
export const createTicketSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  status: ticketStatusSchema,
  assignedUserId: z.number().int().positive().optional(),
});

export const updateTicketSchema = z.object({
  status: ticketStatusSchema,
});

export const updateTicketAssignmentSchema = z.object({
  assignedUserId: z.number().int().positive().nullable(),
});

export const ticketPaginationQuerySchema = z.object({
  page: z.coerce
    .number({
      error: "Invalid page",
    })
    .int()
    .min(1, "Page must be greater than 0")
    .max(1_000_000, "Page is too large")
    .default(1),
  limit: z.coerce
    .number({
      error: "Invalid limit",
    })
    .int()
    .min(1, "Limit must be greater than 0")
    .max(100, "Limit cannot exceed 100")
    .default(20),
});

export const ticketQuerySchema = z.object({
  assignedUserId: z.coerce
    .number({
      error: "Invalid assignedUserId",
    })
    .int()
    .positive()
    .optional(),

  status: ticketStatusSchema.optional(),
}).extend(ticketPaginationQuerySchema.shape);

export type TicketPaginationQuery = z.infer<
  typeof ticketPaginationQuerySchema
>;

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type UpdateTicketAssignmentInput = z.infer<
  typeof updateTicketAssignmentSchema
>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;