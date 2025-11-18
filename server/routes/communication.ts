import { Router } from "express";
import { db } from "../../db";
import {
  communicationTemplates,
  communicationLog,
  notificationPreferences,
  clients
} from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import * as nodemailer from "nodemailer";

const router = Router();

// Email transporter configuration (use environment variables in production)
// Only create transporter if SMTP credentials are provided
const transporter = process.env.SMTP_USER ? nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
}) : null;

// ===================
// COMMUNICATION TEMPLATES
// ===================

// Get all communication templates
router.get("/templates", async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(communicationTemplates)
      .where(eq(communicationTemplates.isActive, true))
      .orderBy(desc(communicationTemplates.createdAt));

    res.json(templates);
  } catch (error) {
    console.error("Error fetching communication templates:", error);
    res.status(500).json({ error: "Failed to fetch communication templates" });
  }
});

// Get single communication template
router.get("/templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const [template] = await db
      .select()
      .from(communicationTemplates)
      .where(eq(communicationTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: "Communication template not found" });
    }

    res.json(template);
  } catch (error) {
    console.error("Error fetching communication template:", error);
    res.status(500).json({ error: "Failed to fetch communication template" });
  }
});

// Create communication template
router.post("/templates", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const {
      name,
      category,
      subject,
      body,
      triggerType,
      triggerConditions,
      channel
    } = req.body;

    if (!name || !category || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [newTemplate] = await db
      .insert(communicationTemplates)
      .values({
        name,
        category,
        subject,
        body,
        triggerType: triggerType || "manual",
        triggerConditions: triggerConditions || {},
        channel: channel || "email",
        isActive: true,
        createdBy: userId
      })
      .returning();

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error creating communication template:", error);
    res.status(500).json({ error: "Failed to create communication template" });
  }
});

// Update communication template
router.put("/templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const {
      name,
      category,
      subject,
      body,
      triggerType,
      triggerConditions,
      channel,
      isActive
    } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (subject !== undefined) updateData.subject = subject;
    if (body !== undefined) updateData.body = body;
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (triggerConditions !== undefined) updateData.triggerConditions = triggerConditions;
    if (channel !== undefined) updateData.channel = channel;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedTemplate] = await db
      .update(communicationTemplates)
      .set(updateData)
      .where(eq(communicationTemplates.id, templateId))
      .returning();

    if (!updatedTemplate) {
      return res.status(404).json({ error: "Communication template not found" });
    }

    res.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating communication template:", error);
    res.status(500).json({ error: "Failed to update communication template" });
  }
});

// Delete communication template
router.delete("/templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);

    // Soft delete
    const [deletedTemplate] = await db
      .update(communicationTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(communicationTemplates.id, templateId))
      .returning();

    if (!deletedTemplate) {
      return res.status(404).json({ error: "Communication template not found" });
    }

    res.json({ message: "Communication template deleted successfully" });
  } catch (error) {
    console.error("Error deleting communication template:", error);
    res.status(500).json({ error: "Failed to delete communication template" });
  }
});

// ===================
// SENDING MESSAGES
// ===================

// Helper function to replace variables in template
function replaceVariables(text: string, variables: Record<string, any>): string {
  let result = text;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(variables[key] || ""));
  });
  return result;
}

// Send one-time message
router.post("/send", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { clientId, sentTo, subject, body, channel } = req.body;

    if (!clientId || !sentTo || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sendChannel = channel || "email";

    // Send email
    if (sendChannel === "email" && transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: sentTo,
          subject: subject || "Message from CPA Portal",
          html: body
        });

        // Log the communication
        const [logEntry] = await db
          .insert(communicationLog)
          .values({
            clientId,
            sentTo,
            subject,
            body,
            sentBy: String(userId),
            channel: "email",
            status: "sent"
          })
          .returning();

        res.json({ message: "Email sent successfully", logEntry });
      } catch (emailError) {
        console.error("Error sending email:", emailError);

        // Log failed attempt
        const [logEntry] = await db
          .insert(communicationLog)
          .values({
            clientId,
            sentTo,
            subject,
            body,
            sentBy: String(userId),
            channel: "email",
            status: "failed",
            errorMessage: String(emailError)
          })
          .returning();

        res.status(500).json({ error: "Failed to send email", logEntry });
      }
    } else {
      // Log as sent (for in-app or when email not configured)
      const [logEntry] = await db
        .insert(communicationLog)
        .values({
          clientId,
          sentTo,
          subject,
          body,
          sentBy: String(userId),
          channel: sendChannel as any,
          status: "sent"
        })
        .returning();

      res.json({ message: "Message logged successfully", logEntry });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Send message from template
router.post("/send-from-template", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { templateId, clientId, variables } = req.body;

    if (!templateId || !clientId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get template
    const [template] = await db
      .select()
      .from(communicationTemplates)
      .where(eq(communicationTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: "Communication template not found" });
    }

    // Get client details
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Get notification preferences
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.clientId, clientId))
      .limit(1);

    // Build variables object
    const templateVars = {
      clientName: client.company || "Client",
      contactEmail: client.contactEmail || "",
      ...variables
    };

    // Replace variables in subject and body
    const subject = replaceVariables(template.subject, templateVars);
    const body = replaceVariables(template.body, templateVars);

    // Determine recipient
    const sentTo = prefs?.email || client.contactEmail || "";

    if (!sentTo) {
      return res.status(400).json({ error: "No email address found for client" });
    }

    // Send email
    if (template.channel === "email" && transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: sentTo,
          subject,
          html: body
        });

        // Log the communication
        const [logEntry] = await db
          .insert(communicationLog)
          .values({
            clientId,
            templateId,
            sentTo,
            subject,
            body,
            sentBy: String(userId),
            channel: "email",
            status: "sent"
          })
          .returning();

        res.json({ message: "Email sent successfully", logEntry });
      } catch (emailError) {
        console.error("Error sending email:", emailError);

        // Log failed attempt
        const [logEntry] = await db
          .insert(communicationLog)
          .values({
            clientId,
            templateId,
            sentTo,
            subject,
            body,
            sentBy: String(userId),
            channel: "email",
            status: "failed",
            errorMessage: String(emailError)
          })
          .returning();

        res.status(500).json({ error: "Failed to send email", logEntry });
      }
    } else {
      // Log as sent (for in-app or when email not configured)
      const [logEntry] = await db
        .insert(communicationLog)
        .values({
          clientId,
          templateId,
          sentTo,
          subject,
          body,
          sentBy: String(userId),
          channel: template.channel as any,
          status: "sent"
        })
        .returning();

      res.json({ message: "Message logged successfully", logEntry });
    }
  } catch (error) {
    console.error("Error sending message from template:", error);
    res.status(500).json({ error: "Failed to send message from template" });
  }
});

// ===================
// COMMUNICATION LOG
// ===================

// Get communication history for a client
router.get("/log/:clientId", async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    const logs = await db
      .select()
      .from(communicationLog)
      .where(eq(communicationLog.clientId, clientId))
      .orderBy(desc(communicationLog.sentAt));

    res.json(logs);
  } catch (error) {
    console.error("Error fetching communication log:", error);
    res.status(500).json({ error: "Failed to fetch communication log" });
  }
});

// Get message details
router.get("/log/message/:id", async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);

    const [message] = await db
      .select()
      .from(communicationLog)
      .where(eq(communicationLog.id, messageId))
      .limit(1);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json(message);
  } catch (error) {
    console.error("Error fetching message details:", error);
    res.status(500).json({ error: "Failed to fetch message details" });
  }
});

// ===================
// NOTIFICATION PREFERENCES
// ===================

// Get notification preferences for a client
router.get("/preferences/:clientId", async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.clientId, clientId))
      .limit(1);

    if (!prefs) {
      // Return default preferences
      return res.json({
        clientId,
        emailEnabled: true,
        smsEnabled: false,
        whatsappEnabled: false,
        notificationTypes: {
          deadline_reminders: true,
          status_updates: true,
          document_requests: true,
          monthly_reports: false
        }
      });
    }

    res.json(prefs);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    res.status(500).json({ error: "Failed to fetch notification preferences" });
  }
});

// Update notification preferences
router.put("/preferences/:clientId", async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const {
      emailEnabled,
      smsEnabled,
      whatsappEnabled,
      email,
      phone,
      whatsappNumber,
      notificationTypes
    } = req.body;

    // Check if preferences exist
    const existing = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.clientId, clientId))
      .limit(1);

    let updatedPrefs;
    if (existing.length > 0) {
      // Update existing
      const updateData: any = { updatedAt: new Date() };

      if (emailEnabled !== undefined) updateData.emailEnabled = emailEnabled;
      if (smsEnabled !== undefined) updateData.smsEnabled = smsEnabled;
      if (whatsappEnabled !== undefined) updateData.whatsappEnabled = whatsappEnabled;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber;
      if (notificationTypes !== undefined) updateData.notificationTypes = notificationTypes;

      [updatedPrefs] = await db
        .update(notificationPreferences)
        .set(updateData)
        .where(eq(notificationPreferences.id, existing[0].id))
        .returning();
    } else {
      // Create new
      [updatedPrefs] = await db
        .insert(notificationPreferences)
        .values({
          clientId,
          emailEnabled: emailEnabled !== false,
          smsEnabled: smsEnabled === true,
          whatsappEnabled: whatsappEnabled === true,
          email: email || null,
          phone: phone || null,
          whatsappNumber: whatsappNumber || null,
          notificationTypes: notificationTypes || {
            deadline_reminders: true,
            status_updates: true,
            document_requests: true,
            monthly_reports: false
          }
        })
        .returning();
    }

    res.json(updatedPrefs);
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

export default router;
