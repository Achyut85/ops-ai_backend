import type { Request, Response } from "express";
import { getOrganizationProfile } from "../services/organization.service.js";

export const getCurrentOrganizationController = async (
  req: Request,
  res: Response,
) => {
  const organization = await getOrganizationProfile(
    req.auth!.organizationId,
  );

  return res.json(organization);
};
