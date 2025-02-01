import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { db } from "@db";
import { projects, users, roles, userRoles } from "@db/schema";
import { eq, and } from "drizzle-orm";

interface ExtWebSocket extends WebSocket {
  userId?: number;
  isAlive: boolean;
  userRole?: string;
}

interface WSMessage {
  type: 'chat' | 'notification' | 'activity' | 'milestone_created' | 'milestone_updated';
  payload: any;
}

interface VerifyClientInfo {
  origin: string;
  secure: boolean;
  req: IncomingMessage;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<number, ExtWebSocket> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: async (info: VerifyClientInfo, callback) => {
        try {
          // Skip Vite HMR connections
          if (info.req.headers['sec-websocket-protocol'] === 'vite-hmr') {
            return callback(false);
          }

          const userId = (info.req as any).session?.passport?.user;
          if (!userId) {
            return callback(false, 401, 'Authentication required');
          }

          // Verify user exists and get their role
          const [user] = await db.select({
            role: users.role
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

          if (!user) {
            return callback(false, 403, 'User not found');
          }

          // Add user role to request for later use
          (info.req as any).userRole = user.role;
          callback(true);
        } catch (error) {
          console.error('WebSocket verification error:', error);
          callback(false, 500, 'Internal server error');
        }
      }
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private startHeartbeat() {
    const interval = setInterval(() => {
      for (const [userId, client] of this.clients) {
        if (!client.isAlive) {
          client.terminate();
          this.clients.delete(userId);
          continue;
        }
        client.isAlive = false;
        client.ping();
      }
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: ExtWebSocket, req) => {
      const userId = (req as any).session?.passport?.user;
      const userRole = (req as any).userRole;

      ws.userId = userId;
      ws.userRole = userRole;
      ws.isAlive = true;
      this.clients.set(userId, ws);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (data: string) => {
        try {
          const message: WSMessage = JSON.parse(data);
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Failed to handle WebSocket message:', error);
          this.sendToClient(ws, {
            type: 'notification',
            payload: {
              type: 'error',
              message: 'Failed to process message',
            }
          });
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        ws.terminate();
      });

      ws.on('close', () => {
        if (ws.userId) {
          this.clients.delete(ws.userId);
        }
      });

      // Send initial connection success
      this.sendToClient(ws, {
        type: 'notification',
        payload: {
          type: 'success',
          message: 'Connected to real-time updates',
          timestamp: new Date().toISOString(),
        }
      });
    });
  }

  private async handleMessage(ws: ExtWebSocket, message: WSMessage) {
    if (!ws.userId) return;

    switch (message.type) {
      case 'chat':
        if (ws.userRole === 'admin' || message.payload.recipientId) {
          await this.handleChatMessage(ws, message);
        }
        break;
      case 'activity':
        await this.handleActivityUpdate(ws, message);
        break;
      case 'milestone_created':
      case 'milestone_updated':
        await this.handleMilestoneUpdate(ws, message);
        break;
    }
  }

  private async handleChatMessage(ws: ExtWebSocket, message: WSMessage) {
    const { recipientId, content } = message.payload;
    const timestamp = new Date().toISOString();

    // If recipient specified, send only to them
    if (recipientId) {
      this.sendToUser(recipientId, {
        type: 'chat',
        payload: {
          senderId: ws.userId,
          content,
          timestamp,
        }
      });
      return;
    }

    // Otherwise broadcast to admins
    this.broadcastToAdmin({
      type: 'chat',
      payload: {
        senderId: ws.userId,
        content,
        timestamp,
      }
    });
  }

  private async handleActivityUpdate(ws: ExtWebSocket, message: WSMessage) {
    const { projectId, activityType, data } = message.payload;

    if (!projectId) return;

    await this.broadcastToProjectMembers(projectId, {
      type: 'activity',
      payload: {
        projectId,
        activityType,
        data,
        userId: ws.userId,
        timestamp: new Date().toISOString(),
      }
    });
  }

  private async handleMilestoneUpdate(ws: ExtWebSocket, message: WSMessage) {
    const { projectId, milestoneId, status, description } = message.payload;

    if (!projectId || !milestoneId) return;

    await this.broadcastToProjectMembers(projectId, {
      type: message.type,
      payload: {
        projectId,
        milestoneId,
        status,
        description,
        updatedBy: ws.userId,
        timestamp: new Date().toISOString(),
      }
    });
  }

  public sendToClient(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public sendToUser(userId: number, message: WSMessage) {
    const client = this.clients.get(userId);
    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  public broadcast(message: WSMessage) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public broadcastToAdmin(message: WSMessage) {
    this.clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN && client.userRole === 'admin') {
        client.send(JSON.stringify(message));
      }
    });
  }

  public async broadcastToProjectMembers(projectId: number, message: WSMessage) {
    try {
      const [project] = await db.select({
        clientId: projects.clientId,
        assignedTo: projects.assignedTo
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

      if (!project) {
        console.error(`Project ${projectId} not found`);
        return;
      }

      // Send to assigned client
      if (project.clientId) {
        const client = this.clients.get(project.clientId);
        if (client?.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      }

      // Send to assigned staff
      if (project.assignedTo) {
        const staff = this.clients.get(project.assignedTo);
        if (staff?.readyState === WebSocket.OPEN) {
          staff.send(JSON.stringify(message));
        }
      }

      // Also broadcast to all admins
      this.broadcastToAdmin(message);
    } catch (error) {
      console.error('Error broadcasting to project members:', error);
    }
  }
}