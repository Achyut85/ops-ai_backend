import { NotFoundError } from "../errors/not-found.error.js";
import { findOrganizationById } from "../repositories/organization.repository.js";

export const getOrganizationProfile = async (organizationId: number) => {
  const organization = await findOrganizationById(organizationId);

  if (!organization) {
    throw new NotFoundError("Organization not found");
  }

  return organization;
};
