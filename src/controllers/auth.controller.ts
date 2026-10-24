import type { Request, Response } from "express";

import { loginOrganization, loginUser, registerOrganization } from "../services/auth.service.js";
import {
  logoutAllSessions,
  logoutSession,
  refreshSession,
} from "../services/auth.service.js";
import { loginSchema, registerOrganizationSchema, userLoginSchema } from "../schemas/auth.schema.js";
import { ValidationError } from "../errors/validation.error.js";
import { UnauthorizedError } from "../errors/unauthorized.error.js";
import {
  clearRefreshCookie,
  getRefreshCookie,
  setRefreshCookie,
} from "../utils/auth-cookie.js";

export const registerOrganizationController = async (
  req: Request,
  res: Response,
) => {
  const parsed = registerOrganizationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  const result = await registerOrganization(parsed.data);

  return res.status(201).json(result);
};

export const loginOrganizationController = async (
  req: Request,
  res: Response,
) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  const { refreshToken, refreshExpiresAt, ...result } =
    await loginOrganization(parsed.data);

  setRefreshCookie(res, refreshToken, refreshExpiresAt);
  return res.status(200).json(result);
};

export const loginUserController = async (
  req: Request,
  res: Response,
) => {
  const parsed = userLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues.map((issue) => issue.message).join(", "),
    );
  }

  const { refreshToken, refreshExpiresAt, ...result } =
    await loginUser(parsed.data);

  setRefreshCookie(res, refreshToken, refreshExpiresAt);
  return res.status(200).json(result);
};

export const refreshSessionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const refreshToken = getRefreshCookie(req);

    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token required");
    }

    const {
      refreshToken: nextRefreshToken,
      refreshExpiresAt,
      accessToken,
    } =
      await refreshSession(refreshToken);

    setRefreshCookie(res, nextRefreshToken, refreshExpiresAt);
    return res.status(200).json({ accessToken });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      clearRefreshCookie(res);
    }
    throw error;
  }
};

export const logoutController = async (req: Request, res: Response) => {
  await logoutSession(getRefreshCookie(req));
  clearRefreshCookie(res);
  return res.status(204).end();
};

export const logoutAllController = async (req: Request, res: Response) => {
  const { sub, actorType, organizationId } = req.auth!;

  await logoutAllSessions({
    actorId: Number(sub),
    actorType,
    organizationId,
  });

  clearRefreshCookie(res);
  return res.status(204).end();
};
