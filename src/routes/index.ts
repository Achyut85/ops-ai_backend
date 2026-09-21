import { Router } from "express"
import ticketRoutes from "./ticket.routes.js";
import userRoutes from "./user.routes.js";
import authRoutes from "./auth.routes.js";

const router = Router();

router.use("/tickets", ticketRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);

export default router;