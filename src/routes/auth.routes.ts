import { Router } from "express";

import { loginOrganizationController, registerOrganizationController } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerOrganizationController);

router.post("/login", loginOrganizationController);

export default router;