import { beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createNewUser } from "../services/user.service.js";

describe("Ticket API", () => {
  let assignedUserId: number;
  let organizationId: number;
  let organizationAccountId: number;
  let organizationAccessToken: string;
  let userAccessToken: string;

  const api = {
    get: (path: string) =>
      request(app).get(path).set("Authorization", `Bearer ${organizationAccessToken}`),
    post: (path: string) =>
      request(app).post(path).set("Authorization", `Bearer ${organizationAccessToken}`),
    patch: (path: string) =>
      request(app).patch(path).set("Authorization", `Bearer ${organizationAccessToken}`),
    delete: (path: string) =>
      request(app).delete(path).set("Authorization", `Bearer ${organizationAccessToken}`),
  };

  const userApi = {
    get: (path: string) =>
      request(app).get(path).set("Authorization", `Bearer ${userAccessToken}`),
    post: (path: string) =>
      request(app).post(path).set("Authorization", `Bearer ${userAccessToken}`),
    patch: (path: string) =>
      request(app).patch(path).set("Authorization", `Bearer ${userAccessToken}`),
  };

  beforeAll(async () => {
    const suffix = `ticket_test_${Date.now()}`;
    const email = `${suffix}@example.com`;
    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: suffix,
        email,
        password: "TestPassword123!",
      });

    expect(registerResponse.status).toBe(201);
    organizationId = registerResponse.body.organization.id;
    organizationAccountId = registerResponse.body.account.id;

    const organizationLoginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password: "TestPassword123!",
      });

    expect(organizationLoginResponse.status).toBe(200);
    organizationAccessToken = organizationLoginResponse.body.accessToken;

    const username = `ticket_test_${Date.now()}`;
    const user = await createNewUser(organizationId, {
      username,
      password: "TestPassword123!",
      name: "Ticket Test User",
    });
    assignedUserId = user.id;

    const loginResponse = await request(app)
      .post("/api/v1/auth/user/login")
      .send({
        organizationId,
        username,
        password: "TestPassword123!",
      });

    expect(loginResponse.status).toBe(200);
    userAccessToken = loginResponse.body.accessToken;
  });

  it("should reject ticket requests without authentication", async () => {
    const response = await request(app).get("/api/v1/tickets");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
  });

  it("should restrict ticket operations to the appropriate actor type", async () => {
    const listResponse = await userApi.get("/api/v1/tickets");
    expect(listResponse.status).toBe(403);

    const createResponse = await userApi
      .post("/api/v1/tickets")
      .send({ title: "Unauthorized user ticket", status: "OPEN" });
    expect(createResponse.status).toBe(403);

    const updateResponse = await api
      .patch("/api/v1/tickets/1")
      .send({ status: "OPEN" });
    expect(updateResponse.status).toBe(403);
  });

  it("should list only the current user's assigned tickets at /me", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Unassigned ticket",
        status: "OPEN",
      });
    expect(createResponse.status).toBe(201);

    const response = await userApi.get("/api/v1/tickets/me");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.every(
      (ticket: { assignedUserId: number | null; organizationId: number }) =>
        ticket.assignedUserId === assignedUserId &&
        ticket.organizationId === organizationId,
    )).toBe(true);
    expect(response.body.some(
      (ticket: { id: number }) => ticket.id === createResponse.body.id,
    )).toBe(false);

    const organizationResponse = await api.get("/api/v1/tickets/me");
    expect(organizationResponse.status).toBe(403);
  });

  it("should allow organization accounts to assign and unassign tickets", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Assignment endpoint test",
        status: "OPEN",
      });
    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;
    const assignResponse = await api
      .patch(`/api/v1/tickets/${ticketId}/assignment`)
      .send({ assignedUserId });

    expect(assignResponse.status).toBe(200);
    expect(assignResponse.body.assignedUserId).toBe(assignedUserId);

    const assignedHistory = await api.get(
      `/api/v1/tickets/${ticketId}/history`,
    );
    expect(assignedHistory.body).toContainEqual(
      expect.objectContaining({
        action: "ASSIGNED",
        oldAssignedUserId: null,
        newAssignedUserId: assignedUserId,
      }),
    );

    const userTickets = await userApi.get("/api/v1/tickets/me");
    expect(userTickets.body.some(
      (ticket: { id: number }) => ticket.id === ticketId,
    )).toBe(true);

    const unassignResponse = await api
      .patch(`/api/v1/tickets/${ticketId}/assignment`)
      .send({ assignedUserId: null });

    expect(unassignResponse.status).toBe(200);
    expect(unassignResponse.body.assignedUserId).toBeNull();

    const unassignedHistory = await api.get(
      `/api/v1/tickets/${ticketId}/history`,
    );
    expect(unassignedHistory.body).toContainEqual(
      expect.objectContaining({
        action: "UNASSIGNED",
        oldAssignedUserId: assignedUserId,
        newAssignedUserId: null,
      }),
    );

    const userUpdateResponse = await userApi
      .patch(`/api/v1/tickets/${ticketId}`)
      .send({ status: "IN_PROGRESS" });
    expect(userUpdateResponse.status).toBe(404);
  });

  it("should prevent users from viewing or updating tickets not assigned to them", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Unassigned ticket access test",
        status: "OPEN",
      });
    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;
    const detailResponse = await userApi.get(`/api/v1/tickets/${ticketId}`);
    const updateResponse = await userApi
      .patch(`/api/v1/tickets/${ticketId}`)
      .send({ status: "IN_PROGRESS" });

    expect(detailResponse.status).toBe(404);
    expect(updateResponse.status).toBe(404);
  });

  // GET /tickets
  it("should get all active tickets", async () => {
    const response = await api
      .get("/api/v1/tickets");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    for (const ticket of response.body) {
      expect(ticket.deletedAt).toBeNull();
      expect(ticket.organizationId).toBe(organizationId);
    }
  });


  // GET /tickets?status=OPEN
  it("should filter tickets by status", async () => {
    const response = await api
      .get("/api/v1/tickets")
      .query({
        status: "OPEN",
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    for (const ticket of response.body) {
      expect(ticket.status).toBe("OPEN");
    }
  });


  // GET /tickets?assignedUserId=1
  it("should filter tickets by assigned user", async () => {
    const response = await api
      .get("/api/v1/tickets")
      .query({
        assignedUserId,
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    for (const ticket of response.body) {
      expect(ticket.assignedUserId).toBe(assignedUserId);
    }
  });


  // Invalid assignedUserId
  it("should reject invalid assignedUserId", async () => {
    const response = await api
      .get("/api/v1/tickets")
      .query({
        assignedUserId: "abc",
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "Invalid assignedUserId",
    });
  });


  // Invalid status query
  it("should reject invalid status filter", async () => {
    const response = await api
      .get("/api/v1/tickets")
      .query({
        status: "INVALID_STATUS",
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "Invalid ticket status",
    });
  });


  // GET /tickets/:_id
  it("should get an existing ticket", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Get test ticket",
        description: "Created for GET test",
        status: "OPEN",
        assignedUserId,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await api
      .get(`/api/v1/tickets/${ticketId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ticketId);
  });


  // GET /tickets/:_id/history
  it("should get ticket history after status update", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "History test ticket",
        description: "Created for history test",
        status: "OPEN",
        assignedUserId,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const updateResponse = await userApi
      .patch(`/api/v1/tickets/${ticketId}`)
      .send({
        status: "IN_PROGRESS",
      });

    expect(updateResponse.status).toBe(200);

    const response = await api
      .get(`/api/v1/tickets/${ticketId}/history`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    expect(response.body.length).toBeGreaterThan(0);

    const statusHistory = response.body.find(
      (history: any) =>
        history.action === "STATUS_CHANGED",
    );

    expect(statusHistory).toBeDefined();
    expect(statusHistory.ticketId).toBe(ticketId);
    expect(statusHistory.organizationId).toBe(organizationId);
    expect(statusHistory.actorId).toBe(assignedUserId);
    expect(statusHistory.actorType).toBe("USER");
    expect(statusHistory.oldStatus).toBe("OPEN");
    expect(statusHistory.newStatus).toBe("IN_PROGRESS");
  });


  // Non-existing ticket
  it("should return 404 for non-existing ticket", async () => {
    const response = await api
      .get("/api/v1/tickets/999999");

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      message: "Ticket not found",
    });
  });


  // POST /tickets
  it("should create a ticket", async () => {
    const response = await api
      .post("/api/v1/tickets")
      .send({
        title: "Automated test ticket",
        description: "Created by Vitest",
        status: "OPEN",
        assignedUserId,
      });

    expect(response.status).toBe(201);

    expect(response.body.id).toBeTypeOf("number");
    expect(response.body.title).toBe(
      "Automated test ticket",
    );
    expect(response.body.status).toBe("OPEN");
    expect(response.body.organizationId).toBe(organizationId);
    expect(response.body.assignedUserId).toBe(assignedUserId);
  });


  // Organization ID should not come from client
  it("should ignore organizationId from request body", async () => {
    const response = await api
      .post("/api/v1/tickets")
      .send({
        title: "Organization isolation test",
        description: "Organization should come from server",
        status: "OPEN",
        organizationId: 999,
        assignedUserId,
      });

    expect(response.status).toBe(201);

    expect(response.body.organizationId).toBe(organizationId);
  });


  // POST with invalid assigned user
  it("should reject an assigned user from another organization", async () => {
    const response = await api
      .post("/api/v1/tickets")
      .send({
        title: "Invalid assignment test",
        description: "Invalid organization assignment",
        status: "OPEN",
        assignedUserId: 999999,
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message:
        "Assigned user does not belong to this organization",
    });
  });


  // PATCH /tickets/:_id
  it("should update ticket status", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Update test ticket",
        description: "Created for update test",
        status: "OPEN",
        assignedUserId,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await userApi
      .patch(`/api/v1/tickets/${ticketId}`)
      .send({
        status: "IN_PROGRESS",
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(
      "IN_PROGRESS",
    );
  });


  // Same status
  it("should reject the same status", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Same status test",
        description: "Created for same status test",
        status: "IN_PROGRESS",
        assignedUserId,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await userApi
      .patch(`/api/v1/tickets/${ticketId}`)
      .send({
        status: "IN_PROGRESS",
      });

    expect(response.status).toBe(409);

    expect(response.body).toEqual({
      message: "Ticket already has this status",
    });
  });


  // Invalid status
  it("should reject an invalid status", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Invalid status test",
        description: "Created for invalid status test",
        status: "OPEN",
        assignedUserId,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await userApi
      .patch(`/api/v1/tickets/${ticketId}`)
      .send({
        status: "INVALID_STATUS",
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "Invalid ticket status",
    });
  });


  // DELETE /tickets/:_id
  it("should soft delete the ticket", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Delete test ticket",
        description: "Created for delete test",
        status: "OPEN",
        assignedUserId,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await api
      .delete(`/api/v1/tickets/${ticketId}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "Ticket deleted successfully",
    });
  });


  // GET deleted ticket
  it("should not return a deleted ticket", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Deleted ticket test",
        description: "Created for deleted ticket test",
        status: "OPEN",
        assignedUserId,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    await api
      .delete(`/api/v1/tickets/${ticketId}`);

    const response = await api
      .get(`/api/v1/tickets/${ticketId}`);

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      message: "Ticket not found",
    });
  });


  // History after delete
  it("should return history for a deleted ticket", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Deleted history test",
        description: "Created for deleted history test",
        status: "OPEN",
        assignedUserId,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    await api
      .delete(`/api/v1/tickets/${ticketId}`);

    const response = await api
      .get(`/api/v1/tickets/${ticketId}/history`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    const deletedHistory = response.body.find(
      (history: any) =>
        history.action === "DELETED",
    );

    expect(deletedHistory).toBeDefined();
    expect(deletedHistory.ticketId).toBe(ticketId);
    expect(deletedHistory.organizationId).toBe(organizationId);
    expect(deletedHistory.actorId).toBe(organizationAccountId);
    expect(deletedHistory.actorType).toBe("ORGANIZATION_ACCOUNT");
  });


  // DELETE already deleted ticket
  it("should not delete an already deleted ticket", async () => {
    const createResponse = await api
      .post("/api/v1/tickets")
      .send({
        title: "Double delete test",
        description: "Created for double delete test",
        status: "OPEN",
        assignedUserId,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    await api
      .delete(`/api/v1/tickets/${ticketId}`);

    const response = await api
      .delete(`/api/v1/tickets/${ticketId}`);

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      message: "Ticket not found",
    });
  });

});