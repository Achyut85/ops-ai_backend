export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED";

export type CreateTicketInput = {
  title: string;
  description?: string;
  status: TicketStatus;
  assignedUserId?: number;
};

export type CreateTicketRepositoryInput =
  CreateTicketInput & {
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
  userId: number;
  action: TicketHistoryAction;
  oldStatus?: TicketStatus;
  newStatus?: TicketStatus;
};