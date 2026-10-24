import { Router } from "express"
import ticketRoutes from "./ticket.routes.js";
import userRoutes from "./user.routes.js";
import authRoutes from "./auth.routes.js";
import organizationRoutes from "./organization.routes.js";

const router = Router();

router.use("/tickets", ticketRoutes);
router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/organizations", organizationRoutes);

export default router;