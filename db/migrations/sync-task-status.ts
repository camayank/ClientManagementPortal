import { db } from "@db";
import { tasks, taskStatusHistory } from "@db/schema";
import { eq } from "drizzle-orm";

export async function syncTaskStatusWorkflow() {
  try {
    // Get all tasks
    const allTasks = await db.select()
      .from(tasks)
      .where(
        eq(tasks.status, "in_progress")
      );

    // Update task status history for each task
    for (const task of allTasks) {
      const [latestHistory] = await db.select()
        .from(taskStatusHistory)
        .where(eq(taskStatusHistory.taskId, task.id))
        .orderBy(taskStatusHistory.createdAt, "desc")
        .limit(1);

      if (!latestHistory || latestHistory.newStatus !== task.status) {
        await db.insert(taskStatusHistory)
          .values({
            taskId: task.id,
            previousStatus: latestHistory?.newStatus || "todo",
            newStatus: task.status,
            changedBy: task.assignedTo || task.createdBy,
            comment: "Status synchronized by system",
          });
      }
    }

    console.log("Task status workflow synchronization completed");
  } catch (error) {
    console.error("Failed to sync task status workflow:", error);
    throw error;
  }
}
