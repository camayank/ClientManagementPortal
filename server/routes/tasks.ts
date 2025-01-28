import { Router } from "express";
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
      console.error("Error fetching tasks:", error);
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
      console.error("Error creating task:", error);
      throw new AppError(error.message || "Failed to create task", error.statusCode || 500);
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
      console.error("Error updating task:", error);
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
      console.error("Error fetching task categories:", error);
      throw new AppError(error.message || "Failed to fetch task categories", error.statusCode || 500);
    }
  }
);

export default router;