import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { createNewUser } from "../services/user.service.js";

describe("POST /api/v1/auth/register", () => {
  it("should register an organization and account", async () => {
    const email = `owner-${Date.now()}@test.com`;

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Test Organization",
        email,
        password: "password123",
      });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      organization: {
        name: "Test Organization",
      },
      account: {
        email,
      },
    });

    expect(response.body.organization.id).toEqual(expect.any(Number));

    expect(response.body.account.id).toEqual(expect.any(Number));

    expect(response.body.account.organizationId).toBe(
      response.body.organization.id,
    );

    expect(response.body.account.passwordHash).toBeUndefined();
  });

  it("should reject an invalid email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Test Organization",
        email: "invalid-email",
        password: "password123",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid email address");
  });

  it("should reject a password shorter than 8 characters", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Test Organization",
        email: `owner-${Date.now()}@test.com`,
        password: "1234567",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Password must be at least 8 characters",
    );
  });

  it("should reject an empty organization name", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "",
        email: `owner-${Date.now()}@test.com`,
        password: "password123",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Organization name is required",
    );
  });

  it("should reject a missing organization name", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: `owner-${Date.now()}@test.com`,
        password: "password123",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Invalid input: expected string, received undefined",
    );
  });

  it("should reject a missing email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Test Organization",
        password: "password123",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid input: expected string, received undefined");
  });

  it("should reject a missing password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Test Organization",
        email: `owner-${Date.now()}@test.com`,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Invalid input: expected string, received undefined",
    );
  });

  it("should reject a duplicate email", async () => {
    const email = `duplicate-${Date.now()}@test.com`;

    const firstResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "First Organization",
        email,
        password: "password123",
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Second Organization",
        email,
        password: "password123",
      });

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.message).toBe("Email already exists");
  });

  it("should normalize the email to lowercase", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Test Organization",
        email: `OWNER-${Date.now()}@TEST.COM`,
        password: "password123",
      });

    expect(response.status).toBe(201);

    expect(response.body.account.email).toBe(
      response.body.account.email.toLowerCase(),
    );
  });
});


describe("POST /api/v1/auth/login", () => {
  it("should login with valid credentials", async () => {
    const email = `login-${Date.now()}@test.com`;
    const password = "password123";

    // Create account first
    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Login Test Organization",
        email,
        password,
      });

    expect(registerResponse.status).toBe(201);

    // Login
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password,
      });

    expect(response.status).toBe(200);

    expect(response.body.accessToken).toBeDefined();

    const decoded = jwt.verify(
      response.body.accessToken,
      process.env.JWT_SECRET!,
    );

    expect(decoded).toMatchObject({
      sub: expect.any(String),
      organizationId: expect.any(Number),
      actorType: "ORGANIZATION_ACCOUNT",
    });

    expect(response.body.account).toMatchObject({
      email,
      organizationId: registerResponse.body.organization.id,
    });

    expect(response.body.account.id).toEqual(expect.any(Number));

    expect(response.body.account.passwordHash).toBeUndefined();
  });
});

it("should reject an incorrect password", async () => {
  const email = `wrong-password-${Date.now()}@test.com`;

  await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Wrong Password Organization",
      email,
      password: "password123",
    });

  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password: "wrongpassword",
    });

  expect(response.status).toBe(401);
  expect(response.body.message).toBe("Invalid email or password");
});

it("should reject a non-existent email", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: `does-not-exist-${Date.now()}@test.com`,
      password: "password123",
    });

  expect(response.status).toBe(401);
  expect(response.body.message).toBe("Invalid email or password");
});

it("should reject an invalid email", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "invalid-email",
      password: "password123",
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe("Invalid email address");
});

it("should reject a missing email", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      password: "password123",
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe("Email is required");
});

it("should reject a missing password", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: `missing-password-${Date.now()}@test.com`,
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe("Password is required");
});

it("should reject a password shorter than 8 characters", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: `short-password-${Date.now()}@test.com`,
      password: "1234567",
    });

  expect(response.status).toBe(400);
  expect(response.body.message).toBe(
    "Password must be at least 8 characters",
  );
});


it("should login an employee with valid credentials", async () => {
  const organizationEmail = `employee-login-${Date.now()}@test.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Employee Login Organization",
      email: organizationEmail,
      password: "password123",
    });

  expect(registerResponse.status).toBe(201);

  const organizationId = registerResponse.body.organization.id;

  await createNewUser(organizationId, {
    username: "john123",
    name: "John",
    email: "john@test.com",
    password: "password123",
  });

  const response = await request(app)
    .post("/api/v1/auth/user/login")
    .send({
      organizationId,
      username: "john123",
      password: "password123",
    });

  expect(response.status).toBe(200);

  expect(response.body.accessToken).toBeDefined();

  expect(response.body.user).toMatchObject({
    username: "john123",
    name: "John",
    email: "john@test.com",
    organizationId,
  });

  expect(response.body.user.passwordHash).toBeUndefined();

  const decoded = jwt.verify(
    response.body.accessToken,
    process.env.JWT_SECRET!,
  );

  expect(decoded).toMatchObject({
    sub: expect.any(String),
    organizationId,
    actorType: "USER",
  });
});

