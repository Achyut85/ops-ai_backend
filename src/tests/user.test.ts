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
  const response = await request(app)
    .post("/api/v1/users")
    .send({
      email: "testuser@example.com",
      username: "testuser",
      name: "Test User",
      organizationId: 1,
    });

  expect(response.status).toBe(201);
  expect(response.body.id).toBeTypeOf("number");
  expect(response.body.email).toBe("testuser@example.com");
  expect(response.body.username).toBe("testuser");
  expect(response.body.organizationId).toBe(1);
});