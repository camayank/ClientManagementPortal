import { Router } from "express";
import { db } from "@db";
import { clients, type Client } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const profileSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  taxId: z.string().optional(),
  website: z.string().url("Invalid website URL").optional(),
  industry: z.string().min(1, "Industry is required"),
});

// Get client profile
router.get("/profile", async (req, res) => {
  if (!req.user) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, req.user.id))
      .limit(1);

    if (!client) {
      return res.status(404).send("Client profile not found");
    }

    res.json(client);
  } catch (error) {
    console.error("Error fetching client profile:", error);
    res.status(500).send("Internal server error");
  }
});

// Update client profile
router.put("/profile", async (req, res) => {
  if (!req.user) {
    return res.status(401).send("Not authenticated");
  }

  try {
    const result = profileSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(result.error.issues.map(i => i.message).join(", "));
    }

    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, req.user.id))
      .limit(1);

    if (!client) {
      // Create new client profile
      const [newClient] = await db
        .insert(clients)
        .values({
          userId: req.user.id,
          ...result.data,
          status: "active",
        })
        .returning();

      return res.json(newClient);
    }

    // Update existing client profile
    const [updatedClient] = await db
      .update(clients)
      .set({
        ...result.data,
        lastActivity: new Date(),
      })
      .where(eq(clients.id, client.id))
      .returning();

    res.json(updatedClient);
  } catch (error) {
    console.error("Error updating client profile:", error);
    res.status(500).send("Internal server error");
  }
});

export default router;
