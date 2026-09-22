import { db } from "../prisma/db.js";
import { isUniqueConstraintError } from "../utils/database-error.js";
import { ConflictError } from "../errors/conflict.error.js";



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