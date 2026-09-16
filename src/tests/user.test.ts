import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("User API", () => {
  it("should get users for an organization", async () => {
    const response = await request(app)
      .get("/api/v1/users");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    for (const user of response.body) {
      expect(user.organizationId).toBe(1);
    }
  });

  it("should get an existing user", async () => {
    const response = await request(app)
      .get("/api/v1/users/1");

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(1);
  });

  it("should return 404 for a non-existing user", async () => {
    const response = await request(app)
      .get("/api/v1/users/999999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "User not found",
    });
  });

  it("should create a user", async () => {
    const username = `testuser_${Date.now()}`;
    const email = `${username}@example.com`;

const response = await request(app)
  .post("/api/v1/users")
  .send({
    email,
    username,
    name: "Test User",
    password: "TestPassword123!",
    role: "TICKET_HANDLER",
    status: "ACTIVE",
  });;

    expect(response.status).toBe(201);
    expect(response.body.id).toBeTypeOf("number");
    expect(response.body.email).toBe(email);
    expect(response.body.username).toBe(username);
    expect(response.body.organizationId).toBe(1);
    expect(response.body.role).toBe("TICKET_HANDLER");
    expect(response.body.status).toBe("ACTIVE");
    expect(response.body.passwordHash).toBeUndefined();
  });
});

it("should not allow duplicate username in the same organization", async () => {
  const username = `duplicate_${Date.now()}`;

  const userData = {
    username,
    password: "TestPassword123!",
    role: "TICKET_HANDLER",
    status: "ACTIVE",
    organizationId: 1,
  };

  const firstResponse = await request(app)
    .post("/api/v1/users")
    .send(userData);

  expect(firstResponse.status).toBe(201);

  const secondResponse = await request(app)
    .post("/api/v1/users")
    .send(userData);

  expect(secondResponse.status).toBe(409);

  expect(secondResponse.body).toEqual({
    message: "Username already exists",
  });
});

it("should update a user's name and email", async () => {
  const username = `updateuser_${Date.now()}`;
  const email = `${username}@example.com`;

  const createResponse = await request(app)
    .post("/api/v1/users")
    .send({
      email,
      username,
      name: "Old Name",
      password: "TestPassword123!",
      role: "TICKET_HANDLER",
      status: "ACTIVE",
      organizationId: 1,
    });

  expect(createResponse.status).toBe(201);

  const userId = createResponse.body.id;

  const updateResponse = await request(app)
    .patch(`/api/v1/users/${userId}`)
    .send({
      name: "New Name",
      email: "newemail@example.com",
    });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.body.id).toBe(userId);
  expect(updateResponse.body.name).toBe("New Name");
  expect(updateResponse.body.email).toBe("newemail@example.com");
});

it("should return 404 when updating a non-existing user", async () => {
  const response = await request(app)
    .patch("/api/v1/users/999999")
    .send({
      name: "New Name",
      email: "newemail@example.com",
    });

  expect(response.status).toBe(404);
  expect(response.body).toEqual({
    message: "User not found",
  });
});


it("should update a user's status", async () => {
  const username = `statususer_${Date.now()}`;

  const createResponse = await request(app)
    .post("/api/v1/users")
    .send({
      username,
      password: "TestPassword123!",
      role: "TICKET_HANDLER",
      status: "ACTIVE",
    });

  expect(createResponse.status).toBe(201);

  const userId = createResponse.body.id;

  const updateResponse = await request(app)
    .patch(`/api/v1/users/${userId}/status`)
    .send({
      status: "DISABLED",
    });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.body.id).toBe(userId);
  expect(updateResponse.body.status).toBe("DISABLED");
  expect(updateResponse.body.organizationId).toBe(1);
});

it("should return 404 when updating status of a non-existing user", async () => {
  const response = await request(app)
    .patch("/api/v1/users/999999/status")
    .send({
      status: "DISABLED",
    });

  expect(response.status).toBe(404);

  expect(response.body).toEqual({
    message: "User not found",
  });
});


it("should update the current user's profile", async () => {
  const response = await request(app)
    .patch("/api/v1/users/me")
    .send({
      name: "Updated Current User",
      email: "updated@example.com",
    });

  expect(response.status).toBe(200);

  expect(response.body.id).toBe(1);
  expect(response.body.organizationId).toBe(1);
  expect(response.body.name).toBe("Updated Current User");
  expect(response.body.email).toBe("updated@example.com");
});


it("should only update allowed profile fields for the current user", async () => {
  const response = await request(app)
    .patch("/api/v1/users/me")
    .send({
      name: "Profile User",
      email: "profile@example.com",
      role: "MANAGER",
      status: "DISABLED",
      organizationId: 999,
    });

  expect(response.status).toBe(200);

  expect(response.body.id).toBe(1);
  expect(response.body.organizationId).toBe(1);

  expect(response.body.name).toBe("Profile User");
  expect(response.body.email).toBe("profile@example.com");

  expect(response.body.role).not.toBe("MANAGER");
  expect(response.body.status).not.toBe("DISABLED");
});