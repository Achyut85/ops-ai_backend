import { Router } from "express";
import ticketRoutes from "./ticket.routes.js";

const router = Router();

router.use("/tickets", ticketRoutes);

export default router;