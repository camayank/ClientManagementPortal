import { Router } from "express";
import { TaskService } from "../services/task.service";
import { requirePermission } from "../middleware/check-permission";
import { insertTaskSchema } from "@db/schema";
import { taskLimiter } from "../middleware/rate-limit";
import type { Request, Response } from "express";

const router = Router();

// Get all tasks
router.get("/", 
  taskLimiter,
  requirePermission('tasks', 'read'), 
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const taskList = await TaskService.getTasks(user.id, user.role);
      res.json(taskList);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      res.status(error.statusCode || 500).json({
        message: error.message || "Failed to fetch tasks"
      });
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
        return res.status(400).json({
          message: "Invalid task data",
          errors: result.error.issues,
        });
      }

      const user = req.user as any;
      const newTask = await TaskService.createTask(result.data, user.id);
      res.status(201).json(newTask);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(error.statusCode || 500).json({
        message: error.message || "Failed to create task"
      });
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
      const user = req.user as any;
      const taskId = parseInt(id);

      const hasAccess = await TaskService.validateTaskAccess(taskId, user.id, user.role);
      if (!hasAccess) {
        return res.status(403).json({ message: "Not authorized to update this task" });
      }

      const updatedTask = await TaskService.updateTask(taskId, req.body);
      res.json(updatedTask);
    } catch (error: any) {
      console.error("Error updating task:", error);
      res.status(error.statusCode || 500).json({
        message: error.message || "Failed to update task"
      });
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
      console.error("Error fetching task categories:", error);
      res.status(error.statusCode || 500).json({
        message: error.message || "Failed to fetch task categories"
      });
    }
  }
);

export default router;