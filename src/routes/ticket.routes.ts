import { Router } from "express";
import { db } from "../prisma/db.js";

const router = Router();

router.get("/:_id", async (req, res) => {
  const ticket = await db.orm.public.Ticket
    .where({ id: parseInt(req.params._id) })
    .first();

  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found" });
  }

  res.json(ticket);
});


router.post("/", async (req, res) => {
  const ticket = await db.orm.public.Ticket.create({
    title: req.body.title,
    description: req.body.description,
    status: req.body.status,
    organizationId: req.body.organizationId,
    assignedUserId: req.body.assignedUserId,
  });

  res.status(201).json(ticket);
});

router.patch("/:_id", async (req, res) => {
  const validStatuses = [
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
  ];

  const { status } = req.body;
  const ticketId = parseInt(req.params._id);

  // 1. Validate requested status
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid ticket status",
    });
  }

  try {
    // 2. Start transaction
    const result = await db.transaction(async (tx) => {
      // Find current ticket
      const ticket = await tx.orm.public.Ticket
        .where({ id: ticketId })
        .first();

      // Ticket does not exist
      if (!ticket) {
        return null;
      }

      // Same status
      if (ticket.status === status) {
        return "SAME_STATUS";
      }

      // Update ticket
      const updatedTicket = await tx.orm.public.Ticket
        .where({ id: ticketId })
        .update({
          status,
        });

      // Unexpected update failure
      if (!updatedTicket) {
        throw new Error("Ticket update failed");
      }

      // Create history
      await tx.orm.public.TicketHistory.create({
        ticketId: updatedTicket.id,
        userId: 1,
        status: updatedTicket.status,
      });

      // Transaction succeeds
      return updatedTicket;
    });

    // 3. Ticket not found
    if (result === null) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    // 4. Same status
    if (result === "SAME_STATUS") {
      return res.status(400).json({
        message: "Ticket is already in this status",
      });
    }

    // 5. Success
    return res.json(result);

  } catch (error) {
    // 6. Transaction failed
    console.error("Transaction failed:", error);

    return res.status(500).json({
      message: "Failed to update ticket",
    });
  }
});

export default router;