import { db } from "../prisma/db.js";

import {
  createRefreshSession,
  createOrganization,
  createOrganizationAccount,
  findRefreshOrganizationAccount,
  findRefreshFamilyStart,
  findRefreshSessionByTokenHash,
  findRefreshUser,
  findOrganizationAccountByEmail,
  findUserByUsername,
  revokeActorRefreshSessions,
  revokeRefreshFamily,
  revokeRefreshSession,
} from "../repositories/auth.repository.js";

import { hashPassword, verifyPassword } from "../utils/password.js";

import type { LoginInput, RegisterOrganizationInput, UserLoginInput } from "../schemas/auth.schema.js";
import { UnauthorizedError } from "../errors/unauthorized.error.js";
import { generateAccessToken } from "../utils/jwt.js";
import {
  createRefreshFamilyId,
  createRefreshToken,
  hashRefreshToken,
} from "../utils/refresh-token.js";
import {
  REFRESH_SESSION_ABSOLUTE_TTL_MS,
  REFRESH_SESSION_TTL_MS,
} from "../utils/auth-cookie.js";
import type { ActorType, RefreshSessionIdentity } from "../types/auth.types.js";

const issueSession = async (
  identity: RefreshSessionIdentity,
  familyId = createRefreshFamilyId(),
) => {
  const refreshToken = createRefreshToken();
  const now = Date.now();
  const absoluteExpiresAt = new Date(
    now + REFRESH_SESSION_ABSOLUTE_TTL_MS,
  ).toISOString();
  const expiresAt = new Date(
    Math.min(now + REFRESH_SESSION_TTL_MS, Date.parse(absoluteExpiresAt)),
  ).toISOString();

  await db.transaction(async (tx) => {
    await createRefreshSession(tx, {
      ...identity,
      familyId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt,
      absoluteExpiresAt,
    });
  });

  return {
    accessToken: generateAccessToken({
      sub: String(identity.actorId),
      organizationId: identity.organizationId,
      actorType: identity.actorType,
    }),
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
};

export const registerOrganization = async (
  data: RegisterOrganizationInput,
) => {
  const passwordHash = await hashPassword(data.password);

  return db.transaction(async (tx) => {
    const organization = await createOrganization(
      tx,
      data.organizationName,
    );

    const account = await createOrganizationAccount(
      tx,
      data.email,
      passwordHash,
      organization.id,
    );

    return {
      organization,
      account: {
        id: account.id,
        email: account.email,
        organizationId: account.organizationId,
      },
    };
  });
};

export const loginOrganization = async (data: LoginInput) => {
  const account = await findOrganizationAccountByEmail(
    data.email,
  );

  if (!account) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isPasswordValid = await verifyPassword(
    data.password,
    account.passwordHash,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const session = await issueSession({
    actorId: account.id,
    organizationId: account.organizationId,
    actorType: "ORGANIZATION_ACCOUNT",
  });

  return {
    ...session,
    account: {
      id: account.id,
      email: account.email,
      organizationId: account.organizationId,
    },
  
  };
};


export const loginUser = async (data: UserLoginInput) => {
  const user = await findUserByUsername(
    data.organizationId,
    data.username,
  );

  if (!user) {
    throw new UnauthorizedError("Invalid username or password");
  }

  const isPasswordValid = await verifyPassword(
    data.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid username or password");
  }

  if (user.status !== "ACTIVE") {
    throw new UnauthorizedError("User account is disabled");
  }

  const session = await issueSession({
    actorId: user.id,
    organizationId: user.organizationId,
    actorType: "USER",
  });

  return {
    ...session,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
    },
  };
};

export const refreshSession = async (refreshToken: string) => {
  const tokenHash = hashRefreshToken(refreshToken);
  const now = new Date();
  const revokedAt = now.toISOString();

  const result = await db.transaction(async (tx) => {
    const currentSession = await findRefreshSessionByTokenHash(tx, tokenHash);

    if (!currentSession) {
      return { kind: "invalid" as const };
    }

    if (currentSession.revokedAt) {
      await revokeRefreshFamily(tx, currentSession.familyId, revokedAt);
      return { kind: "reuse" as const };
    }

    if (new Date(currentSession.expiresAt).getTime() <= now.getTime()) {
      await revokeRefreshFamily(tx, currentSession.familyId, revokedAt);
      return { kind: "invalid" as const };
    }

    const familyStart = await findRefreshFamilyStart(
      tx,
      currentSession.familyId,
    );
    if (!familyStart) {
      await revokeRefreshFamily(tx, currentSession.familyId, revokedAt);
      return { kind: "invalid" as const };
    }

    const absoluteExpiresAt =
      currentSession.absoluteExpiresAt ??
      new Date(
        new Date(familyStart.createdAt).getTime() +
          REFRESH_SESSION_ABSOLUTE_TTL_MS,
      ).toISOString();
    const absoluteExpiry = Date.parse(absoluteExpiresAt);

    if (absoluteExpiry <= now.getTime()) {
      await revokeRefreshFamily(tx, currentSession.familyId, revokedAt);
      return { kind: "invalid" as const };
    }

    const revokedSession = await revokeRefreshSession(
      tx,
      currentSession.id,
      tokenHash,
      revokedAt,
    );

    if (!revokedSession) {
      await revokeRefreshFamily(tx, currentSession.familyId, revokedAt);
      return { kind: "reuse" as const };
    }

    if (
      currentSession.actorType !== "USER" &&
      currentSession.actorType !== "ORGANIZATION_ACCOUNT"
    ) {
      await revokeRefreshFamily(tx, currentSession.familyId, revokedAt);
      return { kind: "invalid" as const };
    }

    const identity: RefreshSessionIdentity = {
      actorId: currentSession.actorId,
      actorType: currentSession.actorType,
      organizationId: currentSession.organizationId,
    };

    const actorExists =
      identity.actorType === "USER"
        ? (await findRefreshUser(
            tx,
            identity.actorId,
            identity.organizationId,
          ))?.status === "ACTIVE"
        : Boolean(
            await findRefreshOrganizationAccount(
              tx,
              identity.actorId,
              identity.organizationId,
            ),
          );

    if (!actorExists) {
      await revokeRefreshFamily(tx, currentSession.familyId, revokedAt);
      return { kind: "invalid" as const };
    }

    const nextRefreshToken = createRefreshToken();

    await createRefreshSession(tx, {
      ...identity,
      familyId: currentSession.familyId,
      tokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt: new Date(
        Math.min(
          now.getTime() + REFRESH_SESSION_TTL_MS,
          absoluteExpiry,
        ),
      ).toISOString(),
      absoluteExpiresAt,
    });

    return {
      kind: "rotated" as const,
      identity,
      refreshToken: nextRefreshToken,
      refreshExpiresAt: new Date(
        Math.min(
          now.getTime() + REFRESH_SESSION_TTL_MS,
          absoluteExpiry,
        ),
      ).toISOString(),
    };
  });

  if (result.kind !== "rotated") {
    throw new UnauthorizedError(
      result.kind === "reuse"
        ? "Refresh token reuse detected; session revoked"
        : "Invalid or expired refresh token",
    );
  }

  return {
    ...result,
    accessToken: generateAccessToken({
      sub: String(result.identity.actorId),
      organizationId: result.identity.organizationId,
      actorType: result.identity.actorType,
    }),
  };
};

export const logoutSession = async (refreshToken: string | undefined) => {
  if (!refreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(refreshToken);
  const revokedAt = new Date().toISOString();

  await db.transaction(async (tx) => {
    const session = await findRefreshSessionByTokenHash(tx, tokenHash);

    if (session) {
      await revokeRefreshFamily(tx, session.familyId, revokedAt);
    }
  });
};

export const logoutAllSessions = async (
  identity: RefreshSessionIdentity,
) => {
  await db.transaction(async (tx) => {
    await revokeActorRefreshSessions(
      tx,
      identity.actorId,
      identity.actorType,
      identity.organizationId,
      new Date().toISOString(),
    );
  });
};