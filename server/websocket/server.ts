import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import type { User } from '@db/schema';

interface ExtWebSocket extends WebSocket {
  userId?: number;
  isAlive: boolean;
}

interface WSMessage {
  type: 'chat' | 'notification' | 'activity';
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
      // Ignore Vite HMR websocket connections
      verifyClient: (info: VerifyClientInfo) => {
        return info.req.headers['sec-websocket-protocol'] !== 'vite-hmr';
      }
    });

    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: ExtWebSocket, req) => {
      // Extract user information from session
      const userId = (req as any).session?.passport?.user;
      if (!userId) {
        ws.close(1008, 'Authentication required');
        return;
      }

      ws.userId = userId;
      ws.isAlive = true;
      this.clients.set(userId, ws);

      // Setup ping-pong for connection health check
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (data: string) => {
        try {
          const message: WSMessage = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        if (ws.userId) {
          this.clients.delete(ws.userId);
        }
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'notification',
        payload: {
          message: 'Connected to WebSocket server',
          timestamp: new Date().toISOString(),
        }
      });
    });

    // Setup periodic health checks
    const interval = setInterval(() => {
      for (const client of Array.from(this.wss.clients)) {
        const ws = client as ExtWebSocket;
        if (!ws.isAlive) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      }
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  private handleMessage(ws: ExtWebSocket, message: WSMessage) {
    switch (message.type) {
      case 'chat':
        this.broadcastToAdmin({
          type: 'chat',
          payload: {
            ...message.payload,
            userId: ws.userId,
            timestamp: new Date().toISOString(),
          }
        });
        break;
      // Add more message type handlers here
    }
  }

  // Send message to a specific client
  public sendToClient(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Send message to a specific user by ID
  public sendToUser(userId: number, message: WSMessage) {
    const client = this.clients.get(userId);
    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // Broadcast message to all connected clients
  public broadcast(message: WSMessage) {
    for (const client of Array.from(this.wss.clients)) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  }

  // Broadcast message to all admin users
  public broadcastToAdmin(message: WSMessage) {
    for (const client of Array.from(this.wss.clients)) {
      const ws = client as ExtWebSocket;
      if (ws.readyState === WebSocket.OPEN && ws.userId) {
        // You'll need to check if the user is an admin here
        client.send(JSON.stringify(message));
      }
    }
  }
}