import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";

const unique = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

let organizationId: number;
let organizationToken: string;

const organizationRequest = () => {
  const authorization = `Bearer ${organizationToken}`;

  return {
    get: (path: string) =>
      request(app).get(path).set("Authorization", authorization),
    post: (path: string) =>
      request(app).post(path).set("Authorization", authorization),
    patch: (path: string) =>
      request(app).patch(path).set("Authorization", authorization),
  };
};

const createUser = async (data: Record<string, unknown> = {}) => {
  const username = typeof data.username === "string" ? data.username : unique("user");
  const response = await organizationRequest()
    .post("/api/v1/users")
    .send({
      username,
      password: "TestPassword123!",
      ...data,
    });

  expect(response.status).toBe(201);
  return response.body;
};

const loginAsUser = async (username: string, password = "TestPassword123!") => {
  const response = await request(app)
    .post("/api/v1/auth/user/login")
    .send({ organizationId, username, password });

  expect(response.status).toBe(200);
  return `Bearer ${response.body.accessToken}`;
};

beforeAll(async () => {
  const email = `${unique("users-api")}@example.com`;
  const registration = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Users API Test Organization",
      email,
      password: "TestPassword123!",
    });

  expect(registration.status).toBe(201);
  organizationId = registration.body.organization.id;

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "TestPassword123!" });

  expect(login.status).toBe(200);
  organizationToken = login.body.accessToken;
});

describe("User API", () => {
  it("should get users for the authenticated organization", async () => {
    const user = await createUser();
    const response = await organizationRequest().get("/api/v1/users");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((item: { id: number }) => item.id === user.id)).toBe(true);

    for (const item of response.body) {
      expect(item.organizationId).toBe(organizationId);
    }
  });

  it("should get an existing user", async () => {
    const user = await createUser();
    const response = await organizationRequest().get(`/api/v1/users/${user.id}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(user.id);
  });

  it("should return 404 for a non-existing user", async () => {
    const response = await organizationRequest().get("/api/v1/users/999999999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "User not found" });
  });

  it("should create a user", async () => {
    const username = unique("created");
    const email = `${username}@example.com`;
    const response = await organizationRequest()
      .post("/api/v1/users")
      .send({ email, username, name: "Test User", password: "TestPassword123!" });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeTypeOf("number");
    expect(response.body.email).toBe(email);
    expect(response.body.username).toBe(username);
    expect(response.body.organizationId).toBe(organizationId);
    expect(response.body.role).toBe("TICKET_HANDLER");
    expect(response.body.status).toBe("ACTIVE");
    expect(response.body.passwordHash).toBeUndefined();
  });

  it("should ignore client-provided role and status when creating a user", async () => {
    const username = unique("secure");
    const response = await organizationRequest()
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

  it("should not allow duplicate usernames in the same organization", async () => {
    const username = unique("duplicate");
    const firstResponse = await organizationRequest()
      .post("/api/v1/users")
      .send({ username, password: "TestPassword123!" });
    const secondResponse = await organizationRequest()
      .post("/api/v1/users")
      .send({ username, password: "TestPassword123!" });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body).toEqual({ message: "Username already exists" });
  });

  it("should update a user's name and email", async () => {
    const user = await createUser({ name: "Old Name" });
    const response = await organizationRequest()
      .patch(`/api/v1/users/${user.id}`)
      .send({ name: "New Name", email: "newemail@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(user.id);
    expect(response.body.name).toBe("New Name");
    expect(response.body.email).toBe("newemail@example.com");
  });

  it("should return 404 when updating a non-existing user", async () => {
    const response = await organizationRequest()
      .patch("/api/v1/users/999999999")
      .send({ name: "New Name" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "User not found" });
  });

  it("should update a user's status", async () => {
    const user = await createUser();
    const response = await organizationRequest()
      .patch(`/api/v1/users/${user.id}/status`)
      .send({ status: "DISABLED" });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(user.id);
    expect(response.body.status).toBe("DISABLED");
    expect(response.body.organizationId).toBe(organizationId);
  });

  it("should return 404 when updating status of a non-existing user", async () => {
    const response = await organizationRequest()
      .patch("/api/v1/users/999999999/status")
      .send({ status: "DISABLED" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "User not found" });
  });

  it("should update the current user's profile", async () => {
    const user = await createUser();
    const token = await loginAsUser(user.username);
    const response = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", token)
      .send({ name: "Updated Current User", email: "updated@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(user.id);
    expect(response.body.organizationId).toBe(organizationId);
    expect(response.body.name).toBe("Updated Current User");
    expect(response.body.email).toBe("updated@example.com");
  });

  it("should only update allowed profile fields for the current user", async () => {
    const user = await createUser();
    const token = await loginAsUser(user.username);
    const response = await request(app)
      .patch("/api/v1/users/me")
      .set("Authorization", token)
      .send({
        name: "Profile User",
        email: "profile@example.com",
        role: "MANAGER",
        status: "DISABLED",
        organizationId: 999,
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(user.id);
    expect(response.body.organizationId).toBe(organizationId);
    expect(response.body.name).toBe("Profile User");
    expect(response.body.email).toBe("profile@example.com");
    expect(response.body.role).toBe("TICKET_HANDLER");
    expect(response.body.status).toBe("ACTIVE");
  });

  it("should update only the provided user field", async () => {
    const user = await createUser({
      name: "Original Name",
      email: `${unique("partial")}@example.com`,
    });
    const response = await organizationRequest()
      .patch(`/api/v1/users/${user.id}`)
      .send({ name: "Updated Name" });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(user.id);
    expect(response.body.name).toBe("Updated Name");
    expect(response.body.email).toBe(user.email);
  });

  it("should update only the email field", async () => {
    const user = await createUser({ name: "Original Name" });
    const response = await organizationRequest()
      .patch(`/api/v1/users/${user.id}`)
      .send({ email: "newemail@example.com" });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(user.id);
    expect(response.body.email).toBe("newemail@example.com");
    expect(response.body.name).toBe("Original Name");
  });

  it("should reject an invalid email when updating a user", async () => {
    const user = await createUser();
    const response = await organizationRequest()
      .patch(`/api/v1/users/${user.id}`)
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid email address");
  });

  it("should reject an invalid email when creating a user", async () => {
    const response = await organizationRequest()
      .post("/api/v1/users")
      .send({
        username: unique("invalid-email"),
        email: "not-an-email",
        password: "TestPassword123!",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid email address");
  });

  it("should reject a short password when creating a user", async () => {
    const response = await organizationRequest()
      .post("/api/v1/users")
      .send({ username: unique("short-password"), password: "123" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Password must be at least 8 characters");
  });

  it("should reject a short username when creating a user", async () => {
    const response = await organizationRequest()
      .post("/api/v1/users")
      .send({ username: "ab", password: "TestPassword123!" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Username must be at least 3 characters");
  });

  it("should allow multiple users with the same email", async () => {
    const email = `${unique("shared")}@example.com`;
    const firstResponse = await organizationRequest()
      .post("/api/v1/users")
      .send({ username: unique("shared-user"), email, password: "TestPassword123!" });
    const secondResponse = await organizationRequest()
      .post("/api/v1/users")
      .send({ username: unique("shared-user"), email, password: "TestPassword123!" });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(secondResponse.body.email).toBe(email);
  });
});
