import { Router } from "express";

import {
  createUserController,
  getUserByIdController,
  getUsersController,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/", getUsersController);
router.get("/:_id", getUserByIdController);
router.post("/", createUserController);
  

export default router;