import type { CreateTicketInput , TicketStatus} from "../schemas/ticket.schema.js";
import type { ActorType } from "./auth.types.js";


export type CreateTicketRepositoryInput = CreateTicketInput & {
  organizationId: number;
};

export type UpdateTicketInput = {
  title?: string;
  description?: string;
  status?: TicketStatus;
  assignedUserId?: number;
};

export type TicketHistoryAction =
  | "CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "UPDATED"
  | "DELETED";


export type CreateTicketHistoryInput = {
  organizationId: number;
  ticketId: number;
  actorId: number;
  actorType: ActorType;
  action: TicketHistoryAction;
  oldStatus?: TicketStatus;
  newStatus?: TicketStatus;
  oldAssignedUserId?: number | null;
  newAssignedUserId?: number | null;
};