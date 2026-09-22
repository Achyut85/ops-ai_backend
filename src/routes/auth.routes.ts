import { Router } from "express";

import { loginOrganizationController, loginUserController, registerOrganizationController } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerOrganizationController);

router.post("/login", loginOrganizationController);

router.post("/user/login", loginUserController);
    
export default router;