import { Router } from "express";
import { db } from "../../db";
import {
  workflowTemplates,
  workflowInstances,
  workflowSteps,
  tasks,
  clients
} from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// ===================
// WORKFLOW TEMPLATES
// ===================

// Get all workflow templates
router.get("/templates", async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.isActive, true))
      .orderBy(desc(workflowTemplates.createdAt));

    res.json(templates);
  } catch (error) {
    console.error("Error fetching workflow templates:", error);
    res.status(500).json({ error: "Failed to fetch workflow templates" });
  }
});

// Get single workflow template
router.get("/templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const template = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, templateId))
      .limit(1);

    if (!template.length) {
      return res.status(404).json({ error: "Workflow template not found" });
    }

    res.json(template[0]);
  } catch (error) {
    console.error("Error fetching workflow template:", error);
    res.status(500).json({ error: "Failed to fetch workflow template" });
  }
});

// Create workflow template
router.post("/templates", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { name, type, description, steps, triggerConditions, entityTypes } = req.body;

    if (!name || !type || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [newTemplate] = await db
      .insert(workflowTemplates)
      .values({
        name,
        type,
        description,
        steps,
        triggerConditions,
        entityTypes,
        createdBy: userId,
        isActive: true
      })
      .returning();

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error creating workflow template:", error);
    res.status(500).json({ error: "Failed to create workflow template" });
  }
});

// Update workflow template
router.put("/templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { name, type, description, steps, triggerConditions, entityTypes, isActive } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (steps !== undefined) updateData.steps = steps;
    if (triggerConditions !== undefined) updateData.triggerConditions = triggerConditions;
    if (entityTypes !== undefined) updateData.entityTypes = entityTypes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedTemplate] = await db
      .update(workflowTemplates)
      .set(updateData)
      .where(eq(workflowTemplates.id, templateId))
      .returning();

    if (!updatedTemplate) {
      return res.status(404).json({ error: "Workflow template not found" });
    }

    res.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating workflow template:", error);
    res.status(500).json({ error: "Failed to update workflow template" });
  }
});

// Delete workflow template
router.delete("/templates/:id", async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);

    // Soft delete by marking as inactive
    const [deletedTemplate] = await db
      .update(workflowTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(workflowTemplates.id, templateId))
      .returning();

    if (!deletedTemplate) {
      return res.status(404).json({ error: "Workflow template not found" });
    }

    res.json({ message: "Workflow template deleted successfully" });
  } catch (error) {
    console.error("Error deleting workflow template:", error);
    res.status(500).json({ error: "Failed to delete workflow template" });
  }
});

// ===================
// WORKFLOW INSTANCES
// ===================

// Get all workflow instances for a client
router.get("/instances/:clientId", async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);

    const instances = await db
      .select()
      .from(workflowInstances)
      .where(eq(workflowInstances.clientId, clientId))
      .orderBy(desc(workflowInstances.createdAt));

    res.json(instances);
  } catch (error) {
    console.error("Error fetching workflow instances:", error);
    res.status(500).json({ error: "Failed to fetch workflow instances" });
  }
});

// Get single workflow instance with steps
router.get("/instances/detail/:id", async (req, res) => {
  try {
    const instanceId = parseInt(req.params.id);

    const [instance] = await db
      .select()
      .from(workflowInstances)
      .where(eq(workflowInstances.id, instanceId))
      .limit(1);

    if (!instance) {
      return res.status(404).json({ error: "Workflow instance not found" });
    }

    const steps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowInstanceId, instanceId))
      .orderBy(workflowSteps.stepNumber);

    res.json({ ...instance, steps });
  } catch (error) {
    console.error("Error fetching workflow instance:", error);
    res.status(500).json({ error: "Failed to fetch workflow instance" });
  }
});

// Create workflow instance from template
router.post("/instances", async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { templateId, clientId, dueDate, metadata } = req.body;

    if (!templateId || !clientId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get template
    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: "Workflow template not found" });
    }

    // Create workflow instance
    const [newInstance] = await db
      .insert(workflowInstances)
      .values({
        templateId,
        clientId,
        dueDate: dueDate ? new Date(dueDate) : null,
        totalSteps: template.steps.length,
        status: "not_started",
        metadata,
        createdBy: userId
      })
      .returning();

    // Create workflow steps
    const stepPromises = template.steps.map((step, index) => {
      return db.insert(workflowSteps).values({
        workflowInstanceId: newInstance.id,
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        dependencies: step.dependencies || [],
        status: index === 0 ? "ready" : "pending" // First step is ready
      }).returning();
    });

    await Promise.all(stepPromises);

    res.status(201).json(newInstance);
  } catch (error) {
    console.error("Error creating workflow instance:", error);
    res.status(500).json({ error: "Failed to create workflow instance" });
  }
});

// Update workflow instance status
router.put("/instances/:id/status", async (req, res) => {
  try {
    const instanceId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updateData: any = { status, updatedAt: new Date() };

    if (status === "in_progress" && !req.body.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updatedInstance] = await db
      .update(workflowInstances)
      .set(updateData)
      .where(eq(workflowInstances.id, instanceId))
      .returning();

    if (!updatedInstance) {
      return res.status(404).json({ error: "Workflow instance not found" });
    }

    res.json(updatedInstance);
  } catch (error) {
    console.error("Error updating workflow instance:", error);
    res.status(500).json({ error: "Failed to update workflow instance" });
  }
});

// ===================
// WORKFLOW STEPS
// ===================

// Get all steps for a workflow instance
router.get("/steps/:instanceId", async (req, res) => {
  try {
    const instanceId = parseInt(req.params.instanceId);

    const steps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowInstanceId, instanceId))
      .orderBy(workflowSteps.stepNumber);

    res.json(steps);
  } catch (error) {
    console.error("Error fetching workflow steps:", error);
    res.status(500).json({ error: "Failed to fetch workflow steps" });
  }
});

// Update workflow step
router.put("/steps/:id", async (req, res) => {
  try {
    const stepId = parseInt(req.params.id);
    const { status, assignedTo, dueDate, taskId } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (status !== undefined) {
      updateData.status = status;

      if (status === "in_progress") {
        updateData.startedAt = new Date();
      } else if (status === "completed") {
        updateData.completedAt = new Date();

        // Get the workflow instance and update completed steps count
        const [step] = await db
          .select()
          .from(workflowSteps)
          .where(eq(workflowSteps.id, stepId))
          .limit(1);

        if (step) {
          const [instance] = await db
            .select()
            .from(workflowInstances)
            .where(eq(workflowInstances.id, step.workflowInstanceId))
            .limit(1);

          if (instance) {
            const newCompletedSteps = (instance.completedSteps || 0) + 1;
            await db
              .update(workflowInstances)
              .set({
                completedSteps: newCompletedSteps,
                currentStep: step.stepNumber + 1,
                status: newCompletedSteps >= instance.totalSteps ? "completed" : "in_progress",
                completedAt: newCompletedSteps >= instance.totalSteps ? new Date() : null,
                updatedAt: new Date()
              })
              .where(eq(workflowInstances.id, step.workflowInstanceId));

            // Check if next step should be marked as ready
            const nextSteps = await db
              .select()
              .from(workflowSteps)
              .where(
                and(
                  eq(workflowSteps.workflowInstanceId, step.workflowInstanceId),
                  eq(workflowSteps.status, "pending")
                )
              );

            // Mark steps as ready if all their dependencies are complete
            for (const nextStep of nextSteps) {
              const dependencies = nextStep.dependencies || [];
              if (dependencies.length === 0 || dependencies.includes(stepId)) {
                // Check if all dependencies are complete
                const allComplete = await checkAllDependenciesComplete(nextStep.workflowInstanceId, dependencies);
                if (allComplete) {
                  await db
                    .update(workflowSteps)
                    .set({ status: "ready", updatedAt: new Date() })
                    .where(eq(workflowSteps.id, nextStep.id));
                }
              }
            }
          }
        }
      }
    }

    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (taskId !== undefined) updateData.taskId = taskId;

    const [updatedStep] = await db
      .update(workflowSteps)
      .set(updateData)
      .where(eq(workflowSteps.id, stepId))
      .returning();

    if (!updatedStep) {
      return res.status(404).json({ error: "Workflow step not found" });
    }

    res.json(updatedStep);
  } catch (error) {
    console.error("Error updating workflow step:", error);
    res.status(500).json({ error: "Failed to update workflow step" });
  }
});

// Helper function to check if all dependencies are complete
async function checkAllDependenciesComplete(workflowInstanceId: number, dependencies: number[]): Promise<boolean> {
  if (dependencies.length === 0) return true;

  const completedDeps = await db
    .select()
    .from(workflowSteps)
    .where(
      and(
        eq(workflowSteps.workflowInstanceId, workflowInstanceId),
        eq(workflowSteps.status, "completed")
      )
    );

  const completedStepIds = completedDeps.map(s => s.id);
  return dependencies.every(depId => completedStepIds.includes(depId));
}

export default router;
