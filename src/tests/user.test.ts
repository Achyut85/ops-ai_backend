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
    });

  expect(response.status).toBe(201);
  expect(response.body.id).toBeTypeOf("number");
  expect(response.body.email).toBe(email);
  expect(response.body.username).toBe(username);
  expect(response.body.organizationId).toBe(1);
  expect(response.body.role).toBe("TICKET_HANDLER");
  expect(response.body.status).toBe("ACTIVE");
  expect(response.body.passwordHash).toBeUndefined();
});


it("should ignore client-provided role and status when creating a user", async () => {
  const username = `secureuser_${Date.now()}`;

  const response = await request(app)
    .post("/api/v1/users")
    .send({
      username,
      password: "TestPassword123!",
      role: "ADMIN",
      status: "DISABLED",
    });

  expect(response.status).toBe(201);
  expect(response.body.username).toBe(username);

  expect(response.body.role).toBe("TICKET_HANDLER");
  expect(response.body.status).toBe("ACTIVE");
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


it("should update only the provided user field", async () => {
  const username = `partialupdate_${Date.now()}`;

  const createResponse = await request(app)
    .post("/api/v1/users")
    .send({
      username,
      name: "Original Name",
      email: `${username}@example.com`,
      password: "TestPassword123!",
    });

  expect(createResponse.status).toBe(201);

  const userId = createResponse.body.id;

  const updateResponse = await request(app)
    .patch(`/api/v1/users/${userId}`)
    .send({
      name: "Updated Name",
    });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.body.id).toBe(userId);
  expect(updateResponse.body.name).toBe("Updated Name");
  expect(updateResponse.body.email).toBe(`${username}@example.com`);
});

it("should update only the email field", async () => {
  const username = `emailupdate_${Date.now()}`;
  const originalEmail = `${username}@example.com`;

  const createResponse = await request(app)
    .post("/api/v1/users")
    .send({
      username,
      name: "Original Name",
      email: originalEmail,
      password: "TestPassword123!",
    });

  expect(createResponse.status).toBe(201);

  const userId = createResponse.body.id;

  const updateResponse = await request(app)
    .patch(`/api/v1/users/${userId}`)
    .send({
      email: "newemail@example.com",
    });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.body.id).toBe(userId);
  expect(updateResponse.body.email).toBe("newemail@example.com");
  expect(updateResponse.body.name).toBe("Original Name");
});

it("should reject an invalid email when updating a user", async () => {
  const response = await request(app)
    .patch("/api/v1/users/1")
    .send({
      email: "not-an-email",
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe("Invalid email address");
});

it("should reject an invalid email when creating a user", async () => {
  const username = `invalidemail_${Date.now()}`;

  const response = await request(app)
    .post("/api/v1/users")
    .send({
      username,
      email: "not-an-email",
      password: "TestPassword123!",
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe("Invalid email address");
});

it("should reject an invalid email when creating a user", async () => {
  const username = `invalidemail_${Date.now()}`;

  const response = await request(app)
    .post("/api/v1/users")
    .send({
      username,
      email: "not-an-email",
      password: "TestPassword123!",
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe("Invalid email address");
});

it("should reject a short password when creating a user", async () => {
  const username = `shortpassword_${Date.now()}`;

  const response = await request(app)
    .post("/api/v1/users")
    .send({
      username,
      password: "123",
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe(
    "Password must be at least 8 characters",
  );
});

it("should reject a short username when creating a user", async () => {
  const response = await request(app)
    .post("/api/v1/users")
    .send({
      username: "ab",
      password: "TestPassword123!",
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe(
    "Username must be at least 3 characters",
  );
});

it("should reject an invalid email when updating a user", async () => {
  const response = await request(app)
    .patch("/api/v1/users/1")
    .send({
      email: "not-an-email",
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe("Invalid email address");
});


it("should allow multiple users with the same email", async () => {
  const email = `shared_${Date.now()}@example.com`;

  const firstResponse = await request(app)
    .post("/api/v1/users")
    .send({
      username: `shareduser1_${Date.now()}`,
      email,
      password: "TestPassword123!",
    });

  expect(firstResponse.status).toBe(201);

  const secondResponse = await request(app)
    .post("/api/v1/users")
    .send({
      username: `shareduser2_${Date.now()}`,
      email,
      password: "TestPassword123!",
    });

  expect(secondResponse.status).toBe(201);
  expect(secondResponse.body.email).toBe(email);
});