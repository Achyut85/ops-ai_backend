import { Router } from "express";
import { getCurrentOrganizationController } from "../controllers/organization.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", authenticate, getCurrentOrganizationController);

export default router;
