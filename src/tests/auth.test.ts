import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { createNewUser, updateExistingUserStatus } from "../services/user.service.js";
const uniqueUsername = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const registerAndLoginOrganization = async (suffix: string) => {
  const email = `${uniqueUsername(suffix)}@example.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: suffix,
      email,
      password: "Password123",
    });

  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password: "Password123",
    });

  return {
    accessToken: loginResponse.body.accessToken,
    organizationId: registerResponse.body.organization.id,
  };
};

describe("GET /api/v1/organizations/me", () => {
  it("should return the organization profile for both login types", async () => {
    const suffix = `organization_profile_${Date.now()}`;
    const { accessToken, organizationId } =
      await registerAndLoginOrganization(suffix);

    const organizationResponse = await request(app)
      .get("/api/v1/organizations/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(organizationResponse.status).toBe(200);
    expect(organizationResponse.body).toMatchObject({
      id: organizationId,
      name: suffix,
    });
    expect(organizationResponse.body).not.toHaveProperty("users");
    expect(organizationResponse.body).not.toHaveProperty("tickets");

    const username = uniqueUsername("organization_profile_user");
    await createNewUser(organizationId, {
      username,
      password: "Password123",
    });

    const userLoginResponse = await request(app)
      .post("/api/v1/auth/user/login")
      .send({
        organizationId,
        username,
        password: "Password123",
      });

    expect(userLoginResponse.status).toBe(200);

    const userResponse = await request(app)
      .get("/api/v1/organizations/me")
      .set("Authorization", `Bearer ${userLoginResponse.body.accessToken}`);

    expect(userResponse.status).toBe(200);
    expect(userResponse.body).toMatchObject({
      id: organizationId,
      name: suffix,
    });
  });

  it("should require authentication", async () => {
    const response = await request(app).get("/api/v1/organizations/me");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
  });
});

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

it("should reject employee login with wrong password", async () => {
  const organizationEmail = `employee-wrong-password-${Date.now()}@test.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Wrong Password Organization",
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
      password: "wrongpassword",
    });

  expect(response.status).toBe(401);

  expect(response.body).toEqual({
    message: "Invalid username or password",
  });
});

describe("POST /api/v1/auth/user/login", () => {
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

  it("should reject employee login with wrong password", async () => {
    const organizationEmail = `employee-wrong-password-${Date.now()}@test.com`;

    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Wrong Password Organization",
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
        password: "wrongpassword",
      });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      message: "Invalid username or password",
    });
  });

  it("should reject employee login with nonexistent username", async () => {
    const response = await request(app)
      .post("/api/v1/auth/user/login")
      .send({
        organizationId: 1,
        username: "does-not-exist",
        password: "password123",
      });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      message: "Invalid username or password",
    });
  });

  it("should reject login for a disabled employee", async () => {
    const organizationEmail = `employee-disabled-${Date.now()}@test.com`;

    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: "Disabled User Organization",
        email: organizationEmail,
        password: "password123",
      });

    expect(registerResponse.status).toBe(201);

    const organizationId = registerResponse.body.organization.id;

    const user = await createNewUser(organizationId, {
      username: "disableduser",
      name: "Disabled User",
      email: "disabled@test.com",
      password: "password123",
    });
    
    await updateExistingUserStatus(
      organizationId,
      user.id,
      {
        status: "DISABLED",
      },
    );

    const response = await request(app)
      .post("/api/v1/auth/user/login")
      .send({
        organizationId,
        username: "disableduser",
        password: "password123",
      });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      message: "User account is disabled",
    });
  });

  it("should reject employee login without organizationId", async () => {
    const response = await request(app)
      .post("/api/v1/auth/user/login")
      .send({
        username: "john123",
        password: "password123",
      });

    expect(response.status).toBe(400);
  });

  it("should reject employee login without username", async () => {
    const response = await request(app)
      .post("/api/v1/auth/user/login")
      .send({
        organizationId: 1,
        password: "password123",
      });

    expect(response.status).toBe(400);
  });

  it("should reject employee login without password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/user/login")
      .send({
        organizationId: 1,
        username: "john123",
      });

    expect(response.status).toBe(400);
  });

  it("should reject employee login with short password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/user/login")
      .send({
        organizationId: 1,
        username: "john123",
        password: "short",
      });

    expect(response.status).toBe(400);
  });
});

it("should reject employee creation without authentication", async () => {
  const response = await request(app)
    .post("/api/v1/users")
    .send({
      username: "employee1",
      password: "password123",
      name: "Employee One",
    });

  expect(response.status).toBe(401);
  
});

it("should reject employee creation by a normal user", async () => {
  const username = uniqueUsername("employee");

  const employee = await createNewUser(1, {
    username,
    password: "password123",
    name: "Employee Two",
  });

  // Login as that employee
  const loginResponse = await request(app)
    .post("/api/v1/auth/user/login")
    .send({
      organizationId: 1,
      username: employee.username,
      password: "password123",
    });

  expect(loginResponse.status).toBe(200);

  const userAccessToken = loginResponse.body.accessToken;

  // Try to create another employee using the employee's token
  const newUsername = uniqueUsername("new_employee");

  const response = await request(app)
    .post("/api/v1/users")
    .set("Authorization", `Bearer ${userAccessToken}`)
    .send({
      username: newUsername,
      password: "password123",
      name: "Employee Three",
    });

  expect(response.status).toBe(403);
  expect(response.body.message).toBe("Access denied");
});


it("should allow an organization account to create an employee", async () => {
  const email = `auth-${Date.now()}@example.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Authorization Test Org",
      email,
      password: "password123",
    });

  expect(registerResponse.status).toBe(201);

  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password: "password123",
    });

  expect(loginResponse.status).toBe(200);

  const organizationAccessToken = loginResponse.body.accessToken;

  const username = uniqueUsername("admin_created_employee");

  const response = await request(app)
    .post("/api/v1/users")
    .set("Authorization", `Bearer ${organizationAccessToken}`)
    .send({
      username,
      password: "password123",
      name: "Employee Five",
    });

  expect(response.status).toBe(201);
  expect(response.body.username).toBe(username);
  expect(response.body.name).toBe("Employee Five");
});


it("should allow a user to access their own profile", async () => {
  const username = uniqueUsername("me_user");

  const employee = await createNewUser(1, {
    username,
    password: "password123",
    name: "Me User",
  });

  const loginResponse = await request(app)
    .post("/api/v1/auth/user/login")
    .send({
      organizationId: 1,
      username: employee.username,
      password: "password123",
    });

  expect(loginResponse.status).toBe(200);

  const userAccessToken = loginResponse.body.accessToken;

  const response = await request(app)
    .get("/api/v1/users/me")
    .set("Authorization", `Bearer ${userAccessToken}`);

  expect(response.status).toBe(200);
  expect(response.body.username).toBe(username);
  expect(response.body.name).toBe("Me User");
});


it("should reject an organization account from accessing user /me", async () => {
  const email = `me-admin-${Date.now()}@example.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Me Authorization Org",
      email,
      password: "password123",
    });

  expect(registerResponse.status).toBe(201);

  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password: "password123",
    });

  expect(loginResponse.status).toBe(200);

  const organizationAccessToken = loginResponse.body.accessToken;

  const response = await request(app)
    .get("/api/v1/users/me")
    .set("Authorization", `Bearer ${organizationAccessToken}`);

  expect(response.status).toBe(403);
  expect(response.body.message).toBe("Access denied");
});


it("should reject unauthenticated access to user /me", async () => {
  const response = await request(app)
    .get("/api/v1/users/me");

  expect(response.status).toBe(401);
});


it("should allow a user to update their own profile", async () => {
  const username = uniqueUsername("update_me");

  const employee = await createNewUser(1, {
    username,
    password: "password123",
    name: "Old Name",
  });

  const loginResponse = await request(app)
    .post("/api/v1/auth/user/login")
    .send({
      organizationId: 1,
      username,
      password: "password123",
    });

  expect(loginResponse.status).toBe(200);

  const userAccessToken = loginResponse.body.accessToken;

  const response = await request(app)
    .patch("/api/v1/users/me")
    .set("Authorization", `Bearer ${userAccessToken}`)
    .send({
      name: "New Name",
    });

  expect(response.status).toBe(200);
  expect(response.body.name).toBe("New Name");
});


it("should reject an organization account from updating user /me", async () => {
  const email = `update-admin-${Date.now()}@example.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Update Authorization Org",
      email,
      password: "password123",
    });

  expect(registerResponse.status).toBe(201);

  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password: "password123",
    });

  expect(loginResponse.status).toBe(200);

  const organizationAccessToken = loginResponse.body.accessToken;

  const response = await request(app)
    .patch("/api/v1/users/me")
    .set("Authorization", `Bearer ${organizationAccessToken}`)
    .send({
      name: "Should Not Work",
    });

  expect(response.status).toBe(403);
  expect(response.body.message).toBe("Access denied");
});


it("should reject unauthenticated access to update user /me", async () => {
  const response = await request(app)
    .patch("/api/v1/users/me")
    .send({
      name: "Should Not Work",
    });

  expect(response.status).toBe(401);
});


it("should allow an organization account to get all users", async () => {
  const email = `users-list-${Date.now()}@example.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Users List Org",
      email,
      password: "password123",
    });

  expect(registerResponse.status).toBe(201);

  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email,
      password: "password123",
    });

  expect(loginResponse.status).toBe(200);

  const accessToken = loginResponse.body.accessToken;

  const response = await request(app)
    .get("/api/v1/users")
    .set("Authorization", `Bearer ${accessToken}`);

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});


it("should allow an organization account to get a user by ID", async () => {
  const email = `user-by-id-${Date.now()}@example.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "User By ID Org",
      email,
      password: "password123",
    });

  expect(registerResponse.status).toBe(201);

  const accessToken = (
    await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password: "password123",
      })
  ).body.accessToken;

  const organizationId = registerResponse.body.account.organizationId;

  const employee = await createNewUser(organizationId, {
    username: uniqueUsername("get_user"),
    password: "password123",
    name: "Get User",
  });

  const response = await request(app)
    .get(`/api/v1/users/${employee.id}`)
    .set("Authorization", `Bearer ${accessToken}`);

  expect(response.status).toBe(200);
  expect(response.body.id).toBe(employee.id);
});


it("should allow an organization account to update a user", async () => {
  const email = `update-user-${Date.now()}@example.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Update User Org",
      email,
      password: "password123",
    });

  expect(registerResponse.status).toBe(201);

  const organizationId = registerResponse.body.account.organizationId;

  const accessToken = (
    await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password: "password123",
      })
  ).body.accessToken;

  const employee = await createNewUser(organizationId, {
    username: uniqueUsername("update_user"),
    password: "password123",
    name: "Old Name",
  });

  const response = await request(app)
    .patch(`/api/v1/users/${employee.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Updated Name",
    });

  expect(response.status).toBe(200);
  expect(response.body.name).toBe("Updated Name");
});


it("should allow an organization account to update user status", async () => {
  const email = `status-user-${Date.now()}@example.com`;

  const registerResponse = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: "Status User Org",
      email,
      password: "password123",
    });

  expect(registerResponse.status).toBe(201);

  const organizationId = registerResponse.body.account.organizationId;

  const accessToken = (
    await request(app)
      .post("/api/v1/auth/login")
      .send({
        email,
        password: "password123",
      })
  ).body.accessToken;

  const employee = await createNewUser(organizationId, {
    username: uniqueUsername("status_user"),
    password: "password123",
    name: "Status User",
  });

  const response = await request(app)
    .patch(`/api/v1/users/${employee.id}/status`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      status: "DISABLED",
    });

  expect(response.status).toBe(200);
  expect(response.body.status).toBe("DISABLED");
});

it("should reject a user from getting all users", async () => {
  const username = uniqueUsername("blocked_list");

  const employee = await createNewUser(1, {
    username,
    password: "password123",
    name: "Blocked List User",
  });

  const loginResponse = await request(app)
    .post("/api/v1/auth/user/login")
    .send({
      organizationId: 1,
      username,
      password: "password123",
    });

  const response = await request(app)
    .get("/api/v1/users")
    .set("Authorization", `Bearer ${loginResponse.body.accessToken}`);

  expect(response.status).toBe(403);
  expect(response.body.message).toBe("Access denied");
});


it("should reject a user from getting another user by ID", async () => {
  const employee = await createNewUser(1, {
    username: uniqueUsername("blocked_get"),
    password: "password123",
    name: "Blocked Get User",
  });

  const loginResponse = await request(app)
    .post("/api/v1/auth/user/login")
    .send({
      organizationId: 1,
      username: employee.username,
      password: "password123",
    });

  const response = await request(app)
    .get(`/api/v1/users/${employee.id}`)
    .set("Authorization", `Bearer ${loginResponse.body.accessToken}`);

  expect(response.status).toBe(403);
  expect(response.body.message).toBe("Access denied");
});


it("should reject a user from updating another user", async () => {
  const employee = await createNewUser(1, {
    username: uniqueUsername("blocked_update"),
    password: "password123",
    name: "Blocked Update User",
  });

  const loginResponse = await request(app)
    .post("/api/v1/auth/user/login")
    .send({
      organizationId: 1,
      username: employee.username,
      password: "password123",
    });

  const response = await request(app)
    .patch(`/api/v1/users/${employee.id}`)
    .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
    .send({
      name: "Should Not Work",
    });

  expect(response.status).toBe(403);
  expect(response.body.message).toBe("Access denied");
});


it("should reject a user from changing another user's status", async () => {
  const employee = await createNewUser(1, {
    username: uniqueUsername("blocked_status"),
    password: "password123",
    name: "Blocked Status User",
  });

  const loginResponse = await request(app)
    .post("/api/v1/auth/user/login")
    .send({
      organizationId: 1,
      username: employee.username,
      password: "password123",
    });

  const response = await request(app)
    .patch(`/api/v1/users/${employee.id}/status`)
    .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
    .send({
      status: "DISABLED",
    });

  expect(response.status).toBe(403);
  expect(response.body.message).toBe("Access denied");
});


it("should prevent organization A from viewing organization B's user", async () => {
  const orgA = await registerAndLoginOrganization("org_a");
  const orgB = await registerAndLoginOrganization("org_b");

  const username = uniqueUsername("org_b_user");

  const userB = await createNewUser(orgB.organizationId, {
    username,
    password: "Password123",
    email: `${username}@example.com`,
    name: "Org B User",
  });

  const response = await request(app)
    .get(`/api/v1/users/${userB.id}`)
    .set("Authorization", `Bearer ${orgA.accessToken}`);

  expect(response.status).toBe(404);
  expect(response.body.message).toBe("User not found");
});


it("should prevent organization A from updating organization B's user", async () => {
  const orgA = await registerAndLoginOrganization("org_a");
  const orgB = await registerAndLoginOrganization("org_b");

  const username = uniqueUsername("org_b_user");

  const userB = await createNewUser(orgB.organizationId, {
    username,
    password: "Password123",
    email: `${username}@example.com`,
    name: "Org B User",
  });

  const response = await request(app)
    .patch(`/api/v1/users/${userB.id}`)
    .set("Authorization", `Bearer ${orgA.accessToken}`)
    .send({
      name: "Hacked Name",
    });

  expect(response.status).toBe(404);
  expect(response.body.message).toBe("User not found");
});


it("should prevent organization A from changing organization B's user status", async () => {
  const orgA = await registerAndLoginOrganization("org_a");
  const orgB = await registerAndLoginOrganization("org_b");

  const username = uniqueUsername("org_b_user");

  const userB = await createNewUser(orgB.organizationId, {
    username,
    password: "Password123",
    email: `${username}@example.com`,
    name: "Org B User",
  });

  const response = await request(app)
    .patch(`/api/v1/users/${userB.id}/status`)
    .set("Authorization", `Bearer ${orgA.accessToken}`)
    .send({
      status: "DISABLED",
    });

  expect(response.status).toBe(404);
  expect(response.body.message).toBe("User not found");
});


it("should only return users belonging to the authenticated organization", async () => {
  const orgA = await registerAndLoginOrganization("org_a");
  const orgB = await registerAndLoginOrganization("org_b");

  const usernameA = uniqueUsername("org_a_user");
  const usernameB = uniqueUsername("org_b_user");

  await createNewUser(orgA.organizationId, {
    username: usernameA,
    password: "Password123",
    email: `${usernameA}@example.com`,
    name: "Org A User",
  });

  await createNewUser(orgB.organizationId, {
    username: usernameB,
    password: "Password123",
    email: `${usernameB}@example.com`,
    name: "Org B User",
  });

  const response = await request(app)
    .get("/api/v1/users")
    .set("Authorization", `Bearer ${orgA.accessToken}`);

  expect(response.status).toBe(200);

  expect(
    response.body.some(
      (user: { username: string }) => user.username === usernameA,
    ),
  ).toBe(true);

  expect(
    response.body.some(
      (user: { username: string }) => user.username === usernameB,
    ),
  ).toBe(false);
});


it("should allow organization B to access its own user", async () => {
  const orgA = await registerAndLoginOrganization("org_a");
  const orgB = await registerAndLoginOrganization("org_b");

  const usernameB = uniqueUsername("org_b_user");

  const userB = await createNewUser(orgB.organizationId, {
    username: usernameB,
    password: "Password123",
    email: `${usernameB}@example.com`,
    name: "Org B User",
  });

  // Org A should not be able to access it.
  const forbiddenForA = await request(app)
    .get(`/api/v1/users/${userB.id}`)
    .set("Authorization", `Bearer ${orgA.accessToken}`);

  expect(forbiddenForA.status).toBe(404);

  // Org B should be able to access its own user.
  const allowedForB = await request(app)
    .get(`/api/v1/users/${userB.id}`)
    .set("Authorization", `Bearer ${orgB.accessToken}`);

  expect(allowedForB.status).toBe(200);
  expect(allowedForB.body.username).toBe(usernameB);
});