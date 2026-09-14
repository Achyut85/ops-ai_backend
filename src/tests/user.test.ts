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
    organizationId: 1,
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