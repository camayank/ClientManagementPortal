import { Router } from "express";
import { logger } from "../utils/logger";
import { TaskService } from "../services/task.service";
import { requirePermission } from "../middleware/check-permission";
import { insertTaskSchema } from "@db/schema";
import { taskLimiter } from "../middleware/rate-limit";
import { AppError } from "../middleware/error-handler";
import type { Request, Response } from "express";
import { z } from "zod";

const router = Router();

// Query parameter validation schema
const taskQuerySchema = z.object({
  status: z.enum(["backlog", "todo", "in_progress", "pending_review", "in_review", "revision_needed", "blocked", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
});

// Update task validation schema
const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "pending_review", "in_review", "revision_needed", "blocked", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.number().optional(),
  reviewerId: z.number().optional(),
  dueDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
});

// Get all tasks
router.get("/", 
  taskLimiter,
  requirePermission('tasks', 'read'), 
  async (req: Request, res: Response) => {
    try {
      const queryParams = taskQuerySchema.safeParse(req.query);
      if (!queryParams.success) {
        throw new AppError("Invalid query parameters", 400);
      }

      const user = req.user as any;
      if (!user) {
        throw new AppError("Authentication required", 401);
      }

      const taskList = await TaskService.getTasks(user.id, user.role);
      res.json(taskList);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Error fetching tasks:", error);
      throw new AppError(error.message || "Failed to fetch tasks", error.statusCode || 500);
    }
  }
);

// Create new task
router.post("/", 
  taskLimiter,
  requirePermission('tasks', 'create'), 
  async (req: Request, res: Response) => {
    try {
      const result = insertTaskSchema.safeParse(req.body);
      if (!result.success) {
        throw new AppError("Invalid task data: " + result.error.issues.map(i => i.message).join(", "), 400);
      }

      const user = req.user as any;
      if (!user) {
        throw new AppError("Authentication required", 401);
      }

      const newTask = await TaskService.createTask(result.data, user.id);
      res.status(201).json(newTask);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Error creating task:", error);
      throw new AppError(error.message || "Failed to create task", error.statusCode || 500);
    }
  }
);

// Bulk update tasks (must be before /:id route)
router.patch("/bulk-update",
  taskLimiter,
  requirePermission('tasks', 'update'),
  async (req: Request, res: Response) => {
    try {
      const { taskIds, updates } = req.body;

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        throw new AppError("Task IDs array is required", 400);
      }

      const updateResult = updateTaskSchema.safeParse(updates);
      if (!updateResult.success) {
        throw new AppError("Invalid update data: " + updateResult.error.issues.map(i => i.message).join(", "), 400);
      }

      const user = req.user as any;
      if (!user) {
        throw new AppError("Authentication required", 401);
      }

      // Validate access to all tasks
      for (const taskId of taskIds) {
        const hasAccess = await TaskService.validateTaskAccess(taskId, user.id, user.role);
        if (!hasAccess) {
          throw new AppError(`Not authorized to update task ${taskId}`, 403);
        }
      }

      // Update all tasks
      const updatedTasks = await Promise.all(
        taskIds.map((taskId: number) => TaskService.updateTask(taskId, updateResult.data))
      );

      res.json({ success: true, updatedCount: updatedTasks.length });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Error bulk updating tasks:", error);
      throw new AppError(error.message || "Failed to bulk update tasks", error.statusCode || 500);
    }
  }
);

// Bulk delete tasks (must be before /:id route)
router.delete("/bulk-delete",
  taskLimiter,
  requirePermission('tasks', 'delete'),
  async (req: Request, res: Response) => {
    try {
      const { taskIds } = req.body;

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        throw new AppError("Task IDs array is required", 400);
      }

      const user = req.user as any;
      if (!user) {
        throw new AppError("Authentication required", 401);
      }

      // Validate access to all tasks
      for (const taskId of taskIds) {
        const hasAccess = await TaskService.validateTaskAccess(taskId, user.id, user.role);
        if (!hasAccess) {
          throw new AppError(`Not authorized to delete task ${taskId}`, 403);
        }
      }

      // Delete all tasks
      await Promise.all(
        taskIds.map((taskId: number) => TaskService.deleteTask(taskId))
      );

      res.json({ success: true, deletedCount: taskIds.length });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Error bulk deleting tasks:", error);
      throw new AppError(error.message || "Failed to bulk delete tasks", error.statusCode || 500);
    }
  }
);

// Update task
router.patch("/:id", 
  taskLimiter,
  requirePermission('tasks', 'update'), 
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const taskId = parseInt(id);

      if (isNaN(taskId)) {
        throw new AppError("Invalid task ID", 400);
      }

      const result = updateTaskSchema.safeParse(req.body);
      if (!result.success) {
        throw new AppError("Invalid update data: " + result.error.issues.map(i => i.message).join(", "), 400);
      }

      const user = req.user as any;
      if (!user) {
        throw new AppError("Authentication required", 401);
      }

      const hasAccess = await TaskService.validateTaskAccess(taskId, user.id, user.role);
      if (!hasAccess) {
        throw new AppError("Not authorized to update this task", 403);
      }

      const updatedTask = await TaskService.updateTask(taskId, result.data);
      res.json(updatedTask);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Error updating task:", error);
      throw new AppError(error.message || "Failed to update task", error.statusCode || 500);
    }
  }
);

// Get task categories
router.get("/categories", 
  taskLimiter,
  requirePermission('tasks', 'read'), 
  async (_req: Request, res: Response) => {
    try {
      const categories = await TaskService.getTaskCategories();
      res.json(categories);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error("Error fetching task categories:", error);
      throw new AppError(error.message || "Failed to fetch task categories", error.statusCode || 500);
    }
  }
);

export default router;