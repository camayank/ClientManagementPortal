import { Router } from "express";
import { TaskService } from "../services/task.service";
import { requirePermission } from "../middleware/check-permission";
import { insertTaskSchema } from "@db/schema";
import type { Request, Response } from "express";

const router = Router();

// Get all tasks
router.get("/", requirePermission('tasks', 'read'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const taskList = await TaskService.getTasks(user.id, user.role);
    res.json(taskList);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send("Failed to fetch tasks");
  }
});

// Create new task
router.post("/", requirePermission('tasks', 'create'), async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({
      message: "Failed to create task",
      error: (error as Error).message,
    });
  }
});

// Update task
router.patch("/:id", requirePermission('tasks', 'update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    // Authorization check can be moved to service layer if needed
    if (user.role !== 'admin' && user.role !== 'partner') {
      const task = await TaskService.getTasks(user.id, user.role);
      const userTask = task.find(t => t.id === parseInt(id));
      if (!userTask || (userTask.assignedTo !== user.id && userTask.reviewerId !== user.id)) {
        return res.status(403).json({ message: "Not authorized to update this task" });
      }
    }

    const updatedTask = await TaskService.updateTask(parseInt(id), req.body);
    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({
      message: "Failed to update task",
      error: (error as Error).message,
    });
  }
});

// Get task categories
router.get("/categories", requirePermission('tasks', 'read'), async (_req: Request, res: Response) => {
  try {
    const categories = await TaskService.getTaskCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching task categories:", error);
    res.status(500).send("Failed to fetch task categories");
  }
});

export default router;