import { db } from "../prisma/db.js";

export const findOrganizationById = async (organizationId: number) => {
  return db.orm.public.Organization
    .select("id", "name", "createdAt", "updatedAt")
    .where({
      id: organizationId,
    })
    .first();
};
