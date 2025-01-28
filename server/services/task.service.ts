import { db } from "@db";
import { tasks, taskCategories, users, clients } from "@db/schema";
import { eq, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { Task, InsertTask } from "@db/schema";

export class TaskService {
  static async getTasks(userId: number, userRole: string) {
    const baseQuery = db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      status: tasks.status,
      dueDate: tasks.dueDate,
      estimatedHours: tasks.estimatedHours,
      actualHours: tasks.actualHours,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      completedAt: tasks.completedAt,
      taxYear: tasks.taxYear,
      extensionRequested: tasks.extensionRequested,
      extensionDeadline: tasks.extensionDeadline,
      complexity: tasks.complexity,
      categoryId: tasks.categoryId,
      category: taskCategories,
      assignedTo: tasks.assignedTo,
      assignedUser: {
        id: sql<number>`assigned_user.id`,
        username: sql<string>`assigned_user.username`,
        fullName: sql<string>`assigned_user.full_name`,
      },
      reviewerId: tasks.reviewerId,
      reviewer: {
        id: sql<number>`reviewer.id`,
        username: sql<string>`reviewer.username`,
        fullName: sql<string>`reviewer.full_name`,
      },
      clientId: tasks.clientId,
      client: clients,
    })
      .from(tasks)
      .leftJoin(taskCategories, eq(tasks.categoryId, taskCategories.id))
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .leftJoin(users, eq(tasks.reviewerId, users.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id));

    if (userRole === 'client') {
      const [clientRecord] = await db.select()
        .from(clients)
        .where(eq(clients.userId, userId))
        .limit(1);

      if (!clientRecord) {
        throw new Error("Client record not found");
      }

      return baseQuery.where(eq(tasks.clientId, clientRecord.id));
    }

    if (!['admin', 'partner'].includes(userRole)) {
      return baseQuery.where(
        or(
          eq(tasks.assignedTo, userId),
          eq(tasks.reviewerId, userId)
        )
      );
    }

    return baseQuery;
  }

  static async createTask(taskData: InsertTask, userId: number): Promise<Task> {
    const [newTask] = await db.insert(tasks)
      .values({
        ...taskData,
        status: 'pending_review',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newTask;
  }

  static async updateTask(id: number, updateData: Partial<Task>): Promise<Task> {
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!task) {
      throw new Error("Task not found");
    }

    const updates = {
      ...updateData,
      updatedAt: new Date(),
      completedAt: updateData.status === 'completed' && task.status !== 'completed' 
        ? new Date() 
        : task.completedAt
    };

    const [updatedTask] = await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();

    return updatedTask;
  }

  static async getTaskCategories() {
    return db.select().from(taskCategories);
  }
}