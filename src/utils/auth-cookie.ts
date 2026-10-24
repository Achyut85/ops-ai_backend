import type { Request, Response } from "express";

export const REFRESH_COOKIE_NAME = "ops_ai_refresh";
export const REFRESH_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_SESSION_ABSOLUTE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_PATH = "/api/v1/auth";

type SameSite = "lax" | "strict" | "none";

const cookieOptions = () => {
  const sameSite = (process.env.COOKIE_SAME_SITE ?? "lax").toLowerCase();

  if (sameSite !== "lax" && sameSite !== "strict" && sameSite !== "none") {
    throw new Error("COOKIE_SAME_SITE must be lax, strict, or none");
  }

  const secure =
    process.env.COOKIE_SECURE === undefined
      ? process.env.NODE_ENV === "production"
      : process.env.COOKIE_SECURE === "true";

  if (sameSite === "none" && !secure) {
    throw new Error("COOKIE_SECURE must be true when COOKIE_SAME_SITE is none");
  }

  return {
    httpOnly: true,
    secure,
    sameSite: sameSite as SameSite,
    path: REFRESH_COOKIE_PATH,
  };
};

export const setRefreshCookie = (
  res: Response,
  refreshToken: string,
  expiresAt: string,
) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...cookieOptions(),
    maxAge: Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  });
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions());
};

export const getRefreshCookie = (req: Request) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  const prefix = `${REFRESH_COOKIE_NAME}=`;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie?.slice(prefix.length) || undefined;
};
