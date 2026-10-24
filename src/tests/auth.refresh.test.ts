import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";
import { createNewUser } from "../services/user.service.js";
import { db } from "../prisma/db.js";
import { REFRESH_SESSION_ABSOLUTE_TTL_MS } from "../utils/auth-cookie.js";
import { hashRefreshToken } from "../utils/refresh-token.js";

const uniqueValue = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const setCookieFrom = (response: request.Response) => {
  const cookies = response.headers["set-cookie"];

  if (!Array.isArray(cookies) || !cookies[0]) {
    throw new Error("Expected refresh cookie in response");
  }

  return cookies[0];
};

const cookieFrom = (response: request.Response) =>
  setCookieFrom(response).split(";")[0];

const tokenFromCookie = (cookie: string) => cookie.split("=").slice(1).join("=");

const registerAndLoginOrganization = async () => {
  const email = `${uniqueValue("refresh") }@example.com`;
  const password = "Password123!";

  const registration = await request(app)
    .post("/api/v1/auth/register")
    .send({
      organizationName: uniqueValue("Refresh Org"),
      email,
      password,
    });

  expect(registration.status).toBe(201);

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  expect(login.status).toBe(200);
  return {
    accessToken: login.body.accessToken as string,
    organizationId: registration.body.organization.id as number,
    cookie: cookieFrom(login),
    cookieHeader: setCookieFrom(login),
  };
};

describe("refresh token sessions", () => {
  it("creates a hashed refresh session on organization login and rotates it", async () => {
    const session = await registerAndLoginOrganization();
    const originalToken = tokenFromCookie(session.cookie);

    expect(session.cookieHeader).toContain("HttpOnly");
    expect(session.cookieHeader).toContain("SameSite=Lax");
    expect(session.cookieHeader).toContain("Path=/api/v1/auth");

    const storedSession = await db.orm.public.RefreshSession
      .where({ tokenHash: hashRefreshToken(originalToken) })
      .first();
    expect(storedSession).not.toBeNull();
    expect(storedSession?.tokenHash).not.toBe(originalToken);
    expect(storedSession?.actorType).toBe("ORGANIZATION_ACCOUNT");
    expect(storedSession?.organizationId).toBe(session.organizationId);
    expect(storedSession?.absoluteExpiresAt).toEqual(expect.any(String));

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", session.cookie);

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty("refreshToken");

    const rotatedCookie = cookieFrom(response);
    expect(tokenFromCookie(rotatedCookie)).not.toBe(originalToken);

    const oldSession = await db.orm.public.RefreshSession
      .where({ tokenHash: hashRefreshToken(originalToken) })
      .first();
    expect(oldSession?.revokedAt).not.toBeNull();

    const currentSession = await db.orm.public.RefreshSession
      .where({ tokenHash: hashRefreshToken(tokenFromCookie(rotatedCookie)) })
      .first();
    expect(currentSession?.absoluteExpiresAt).toBe(
      storedSession?.absoluteExpiresAt,
    );
  });

  it("rejects refresh after the fixed maximum session age", async () => {
    const session = await registerAndLoginOrganization();
    const refreshToken = tokenFromCookie(session.cookie);
    const storedSession = await db.orm.public.RefreshSession
      .where({ tokenHash: hashRefreshToken(refreshToken) })
      .first();

    expect(storedSession).not.toBeNull();
    await db.orm.public.RefreshSession
      .where({ id: storedSession!.id })
      .update({ absoluteExpiresAt: new Date(Date.now() - 1000).toISOString() });

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", session.cookie);

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    );

    const revokedSession = await db.orm.public.RefreshSession
      .where({ id: storedSession!.id })
      .first();
    expect(revokedSession?.revokedAt).not.toBeNull();
  });

  it("sets an absolute expiry when rotating a legacy session", async () => {
    const session = await registerAndLoginOrganization();
    const refreshToken = tokenFromCookie(session.cookie);
    const storedSession = await db.orm.public.RefreshSession
      .where({ tokenHash: hashRefreshToken(refreshToken) })
      .first();

    expect(storedSession).not.toBeNull();
    await db.orm.public.RefreshSession
      .where({ id: storedSession!.id })
      .update({ absoluteExpiresAt: null });

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", session.cookie);

    expect(response.status).toBe(200);
    const rotatedToken = tokenFromCookie(cookieFrom(response));
    const rotatedSession = await db.orm.public.RefreshSession
      .where({ tokenHash: hashRefreshToken(rotatedToken) })
      .first();
    const expectedAbsoluteExpiry =
      new Date(storedSession!.createdAt).getTime() +
      REFRESH_SESSION_ABSOLUTE_TTL_MS;

    expect(new Date(rotatedSession!.absoluteExpiresAt!).getTime()).toBe(
      expectedAbsoluteExpiry,
    );
  });

  it("rejects reuse and revokes the whole refresh token family", async () => {
    const session = await registerAndLoginOrganization();
    const firstRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", session.cookie);
    expect(firstRefresh.status).toBe(200);

    const rotatedCookie = cookieFrom(firstRefresh);
    const reuseResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", session.cookie);

    expect(reuseResponse.status).toBe(401);
    expect(reuseResponse.body.message).toContain("reuse detected");
    expect(reuseResponse.headers["set-cookie"]?.[0]).toContain(
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    );

    const familyRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", rotatedCookie);
    expect(familyRefresh.status).toBe(401);
  });

  it("handles simultaneous refreshes with one winner and revokes the family", async () => {
    const session = await registerAndLoginOrganization();
    const responses = await Promise.all([
      request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", session.cookie),
      request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", session.cookie),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
    const winner = responses.find((response) => response.status === 200);
    expect(winner).toBeDefined();

    const nextResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookieFrom(winner!));
    expect(nextResponse.status).toBe(401);
  });

  it("logout revokes only the current login session", async () => {
    const email = `${uniqueValue("logout") }@example.com`;
    const password = "Password123!";
    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: uniqueValue("Logout Org"),
        email,
        password,
      });
    expect(registration.status).toBe(201);

    const login1 = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    const login2 = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    const cookie1 = cookieFrom(login1);
    const cookie2 = cookieFrom(login2);

    const logout = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie1);
    expect(logout.status).toBe(204);
    expect(logout.headers["set-cookie"]?.[0]).toContain(
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    );

    const revokedRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie1);
    expect(revokedRefresh.status).toBe(401);

    const otherSessionRefresh = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie2);
    expect(otherSessionRefresh.status).toBe(200);
  });

  it("logout-all revokes all sessions for the authenticated account", async () => {
    const email = `${uniqueValue("logout_all")}@example.com`;
    const password = "Password123!";
    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: uniqueValue("Logout All Org"),
        email,
        password,
      });
    expect(registration.status).toBe(201);

    const login1 = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    const login2 = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    const logoutAll = await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${login1.body.accessToken}`);
    expect(logoutAll.status).toBe(204);

    const storedSessions = await db.orm.public.RefreshSession
      .where({
        actorId: registration.body.account.id,
        actorType: "ORGANIZATION_ACCOUNT",
        organizationId: registration.body.organization.id,
      })
      .all();
    expect(storedSessions.length).toBe(2);
    expect(storedSessions.every((session) => session.revokedAt !== null)).toBe(true);

    for (const login of [login1, login2]) {
      const response = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Cookie", cookieFrom(login));
      expect(response.status).toBe(401);
    }
  });

  it("creates a refresh session for user login and rejects missing refresh cookies", async () => {
    const email = `${uniqueValue("user_refresh")}@example.com`;
    const registration = await request(app)
      .post("/api/v1/auth/register")
      .send({
        organizationName: uniqueValue("User Refresh Org"),
        email,
        password: "Password123!",
      });
    expect(registration.status).toBe(201);

    const username = uniqueValue("refresh_user");
    await createNewUser(registration.body.organization.id, {
      username,
      password: "Password123!",
    });

    const login = await request(app)
      .post("/api/v1/auth/user/login")
      .send({
        organizationId: registration.body.organization.id,
        username,
        password: "Password123!",
      });

    expect(login.status).toBe(200);
    const userSession = await db.orm.public.RefreshSession
      .where({
        tokenHash: hashRefreshToken(tokenFromCookie(cookieFrom(login))),
      })
      .first();
    expect(userSession?.actorType).toBe("USER");

    const missingCookie = await request(app)
      .post("/api/v1/auth/refresh");
    expect(missingCookie.status).toBe(401);
  });
});
