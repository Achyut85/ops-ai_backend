import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { authenticate } from "../middleware/auth.middleware.js";
import { verifyAccessToken } from "../utils/jwt.js";

vi.mock("../utils/jwt.js", () => ({
  verifyAccessToken: vi.fn(),
}));

describe("authenticate middleware", () => {
  it("should reject request without Authorization header", () => {
    const req = {
      headers: {},
    } as Request;

    const next = vi.fn() as NextFunction;

    expect(() => authenticate(req, {} as Response, next)).toThrow(
      "Authentication required",
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("should reject request without Bearer token", () => {
    const req = {
      headers: {
        authorization: "Basic abc123",
      },
    } as Request;

    const next = vi.fn() as NextFunction;

    expect(() => authenticate(req, {} as Response, next)).toThrow(
      "Authentication required",
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("should reject invalid access token", () => {
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const req = {
      headers: {
        authorization: "Bearer invalid-token",
      },
    } as Request;

    const next = vi.fn() as NextFunction;

    expect(() => authenticate(req, {} as Response, next)).toThrow(
      "Invalid or expired access token",
    );

    expect(next).not.toHaveBeenCalled();
  });

  it("should attach auth payload and continue with valid access token", () => {
    const payload = {
      sub: "42",
      organizationId: 10,
      actorType: "USER" as const,
    };

    vi.mocked(verifyAccessToken).mockReturnValue(payload);

    const req = {
      headers: {
        authorization: "Bearer valid-token",
      },
    } as Request;

    const next = vi.fn() as NextFunction;

    authenticate(req, {} as Response, next);

    expect(req.auth).toEqual(payload);
    expect(next).toHaveBeenCalledOnce();
  });

  it("should authenticate an organization account token", () => {
    const payload = {
      sub: "15",
      organizationId: 10,
      actorType: "ORGANIZATION_ACCOUNT" as const,
    };

    vi.mocked(verifyAccessToken).mockReturnValue(payload);

    const req = {
      headers: {
        authorization: "Bearer admin-token",
      },
    } as Request;

    const next = vi.fn() as NextFunction;

    authenticate(req, {} as Response, next);

    expect(req.auth).toEqual(payload);
    expect(next).toHaveBeenCalledOnce();
  });
});

