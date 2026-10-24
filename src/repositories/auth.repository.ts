import { db } from "../prisma/db.js";
import { isUniqueConstraintError } from "../utils/database-error.js";
import { ConflictError } from "../errors/conflict.error.js";
import type { ActorType } from "../types/auth.types.js";



type TransactionClient =
  Parameters<Parameters<typeof db.transaction>[0]>[0];

export const createOrganization = async (
  tx: TransactionClient,
  name: string,
) => {
  return tx.orm.public.Organization.create({
    name,
  });
};

export const createOrganizationAccount = async (
  tx: TransactionClient,
  email: string,
  passwordHash: string,
  organizationId: number,
) => {
  try {
    return await tx.orm.public.OrganizationAccount.create({
      email,
      passwordHash,
      organizationId,
    });
  } catch (error) {
    if (
      isUniqueConstraintError(error) &&
      error.constraint === "organizationAccount_email_key"
    ) {
      throw new ConflictError("Email already exists");
    }

    throw error;
  }
};


export const findOrganizationAccountByEmail = async (
  email: string,
) => {
  return db.orm.public.OrganizationAccount
    .where({
      email,
    })
    .first();
};


export const findUserByUsername = async (
  organizationId: number,
  username: string,
) => {
  return db.orm.public.User
    .where({
      organizationId,
      username,
    })
    .first();
};

type RefreshSessionTransactionClient =
  Parameters<Parameters<typeof db.transaction>[0]>[0];

export const createRefreshSession = async (
  tx: RefreshSessionTransactionClient,
  session: {
    familyId: string;
    tokenHash: string;
    actorId: number;
    actorType: ActorType;
    organizationId: number;
    expiresAt: string;
    absoluteExpiresAt: string | null;
  },
) => {
  return tx.orm.public.RefreshSession.create(session);
};

export const findRefreshSessionByTokenHash = async (
  tx: RefreshSessionTransactionClient,
  tokenHash: string,
) => {
  return tx.orm.public.RefreshSession
    .where({ tokenHash })
    .first();
};

export const findRefreshFamilyStart = async (
  tx: RefreshSessionTransactionClient,
  familyId: string,
) => {
  return tx.orm.public.RefreshSession
    .where({ familyId })
    .orderBy((session) => session.createdAt.asc())
    .first();
};

export const findRefreshUser = async (
  tx: RefreshSessionTransactionClient,
  userId: number,
  organizationId: number,
) => {
  return tx.orm.public.User
    .where({
      id: userId,
      organizationId,
    })
    .first();
};

export const findRefreshOrganizationAccount = async (
  tx: RefreshSessionTransactionClient,
  accountId: number,
  organizationId: number,
) => {
  return tx.orm.public.OrganizationAccount
    .where({
      id: accountId,
      organizationId,
    })
    .first();
};

export const revokeRefreshSession = async (
  tx: RefreshSessionTransactionClient,
  sessionId: number,
  tokenHash: string,
  revokedAt: string,
) => {
  const updatedSessions = await tx.orm.public.RefreshSession
    .where({
      id: sessionId,
      tokenHash,
      revokedAt: null,
    })
    .update({ revokedAt });

  return updatedSessions !== null;
};

export const revokeRefreshFamily = async (
  tx: RefreshSessionTransactionClient,
  familyId: string,
  revokedAt: string,
) => {
  const plan = tx.sql.public.refreshSession
    .update({ revokedAt })
    .where((session, fns) => fns.eq(session.familyId, familyId))
    .where((session, fns) => fns.eq(session.revokedAt, null))
    .build();

  return tx.execute(plan);
};

export const revokeActorRefreshSessions = async (
  tx: RefreshSessionTransactionClient,
  actorId: number,
  actorType: ActorType,
  organizationId: number,
  revokedAt: string,
) => {
  const plan = tx.sql.public.refreshSession
    .update({ revokedAt })
    .where((session, fns) => fns.eq(session.actorId, actorId))
    .where((session, fns) => fns.eq(session.actorType, actorType))
    .where((session, fns) => fns.eq(session.organizationId, organizationId))
    .where((session, fns) => fns.eq(session.revokedAt, null))
    .build();

  return tx.execute(plan);
};