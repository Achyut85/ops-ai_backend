import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("Ticket API", () => {

  // GET /tickets
  it("should get all active tickets", async () => {
    const response = await request(app)
      .get("/api/v1/tickets");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    for (const ticket of response.body) {
      expect(ticket.deletedAt).toBeNull();
      expect(ticket.organizationId).toBe(1);
    }
  });


  // GET /tickets?status=OPEN
  it("should filter tickets by status", async () => {
    const response = await request(app)
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
    const response = await request(app)
      .get("/api/v1/tickets")
      .query({
        assignedUserId: 1,
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    for (const ticket of response.body) {
      expect(ticket.assignedUserId).toBe(1);
    }
  });


  // Invalid assignedUserId
  it("should reject invalid assignedUserId", async () => {
    const response = await request(app)
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
    const response = await request(app)
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
    const createResponse = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Get test ticket",
        description: "Created for GET test",
        status: "OPEN",
        assignedUserId: 1,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await request(app)
      .get(`/api/v1/tickets/${ticketId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ticketId);
  });


  // GET /tickets/:_id/history
  it("should get ticket history after status update", async () => {
    const createResponse = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "History test ticket",
        description: "Created for history test",
        status: "OPEN",
        assignedUserId: 1,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const updateResponse = await request(app)
      .patch(`/api/v1/tickets/${ticketId}`)
      .send({
        status: "IN_PROGRESS",
      });

    expect(updateResponse.status).toBe(200);

    const response = await request(app)
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
    expect(statusHistory.organizationId).toBe(1);
    expect(statusHistory.userId).toBe(1);
    expect(statusHistory.oldStatus).toBe("OPEN");
    expect(statusHistory.newStatus).toBe("IN_PROGRESS");
  });


  // Non-existing ticket
  it("should return 404 for non-existing ticket", async () => {
    const response = await request(app)
      .get("/api/v1/tickets/999999");

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      message: "Ticket not found",
    });
  });


  // POST /tickets
  it("should create a ticket", async () => {
    const response = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Automated test ticket",
        description: "Created by Vitest",
        status: "OPEN",
        assignedUserId: 1,
      });

    expect(response.status).toBe(201);

    expect(response.body.id).toBeTypeOf("number");
    expect(response.body.title).toBe(
      "Automated test ticket",
    );
    expect(response.body.status).toBe("OPEN");
    expect(response.body.organizationId).toBe(1);
    expect(response.body.assignedUserId).toBe(1);
  });


  // Organization ID should not come from client
  it("should ignore organizationId from request body", async () => {
    const response = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Organization isolation test",
        description: "Organization should come from server",
        status: "OPEN",
        organizationId: 999,
        assignedUserId: 1,
      });

    expect(response.status).toBe(201);

    expect(response.body.organizationId).toBe(1);
  });


  // POST with invalid assigned user
  it("should reject an assigned user from another organization", async () => {
    const response = await request(app)
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
    const createResponse = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Update test ticket",
        description: "Created for update test",
        status: "OPEN",
        assignedUserId: 1,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await request(app)
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
    const createResponse = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Same status test",
        description: "Created for same status test",
        status: "IN_PROGRESS",
        assignedUserId: 1,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await request(app)
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
    const createResponse = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Invalid status test",
        description: "Created for invalid status test",
        status: "OPEN",
        assignedUserId: 1,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await request(app)
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
    const createResponse = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Delete test ticket",
        description: "Created for delete test",
        status: "OPEN",
        assignedUserId: 1,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    const response = await request(app)
      .delete(`/api/v1/tickets/${ticketId}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: "Ticket deleted successfully",
    });
  });


  // GET deleted ticket
  it("should not return a deleted ticket", async () => {
    const createResponse = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Deleted ticket test",
        description: "Created for deleted ticket test",
        status: "OPEN",
        assignedUserId: 1,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    await request(app)
      .delete(`/api/v1/tickets/${ticketId}`);

    const response = await request(app)
      .get(`/api/v1/tickets/${ticketId}`);

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      message: "Ticket not found",
    });
  });


  // History after delete
  it("should return history for a deleted ticket", async () => {
    const createResponse = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Deleted history test",
        description: "Created for deleted history test",
        status: "OPEN",
        assignedUserId: 1,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    await request(app)
      .delete(`/api/v1/tickets/${ticketId}`);

    const response = await request(app)
      .get(`/api/v1/tickets/${ticketId}/history`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    const deletedHistory = response.body.find(
      (history: any) =>
        history.action === "DELETED",
    );

    expect(deletedHistory).toBeDefined();
    expect(deletedHistory.ticketId).toBe(ticketId);
    expect(deletedHistory.organizationId).toBe(1);
    expect(deletedHistory.userId).toBe(1);
  });


  // DELETE already deleted ticket
  it("should not delete an already deleted ticket", async () => {
    const createResponse = await request(app)
      .post("/api/v1/tickets")
      .send({
        title: "Double delete test",
        description: "Created for double delete test",
        status: "OPEN",
        assignedUserId: 1,
      });

    expect(createResponse.status).toBe(201);

    const ticketId = createResponse.body.id;

    await request(app)
      .delete(`/api/v1/tickets/${ticketId}`);

    const response = await request(app)
      .delete(`/api/v1/tickets/${ticketId}`);

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      message: "Ticket not found",
    });
  });

});