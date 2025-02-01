import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: 'chat' | 'notification' | 'activity' | 'milestone_created' | 'milestone_updated';
  payload: any;
}

const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established');
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection

        // Send initial authentication
        if (user) {
          ws.send(JSON.stringify({
            type: 'auth',
            payload: { userId: user.id }
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'notification':
              handleNotification(message.payload);
              break;
            case 'chat':
              handleChatMessage(message.payload);
              break;
            case 'activity':
              handleActivityUpdate(message.payload);
              break;
            case 'milestone_created':
            case 'milestone_updated':
              handleMilestoneUpdate(message.payload);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        wsRef.current = null;

        // Only attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          toast({
            title: "Connection Lost",
            description: "Real-time connection lost. Reconnecting...",
            duration: 3000,
          });

          // Attempt to reconnect after delay
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, RECONNECT_INTERVAL);
        } else {
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: "Unable to establish real-time connection. Please refresh the page.",
          });
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [user, toast]);

  const handleNotification = (payload: any) => {
    toast({
      title: payload.type === 'error' ? "Error" : "Notification",
      description: payload.message,
      variant: payload.type === 'error' ? "destructive" : "default",
    });
  };

  const handleChatMessage = (payload: any) => {
    // Invalidate chat messages query
    queryClient.invalidateQueries({ queryKey: ['/api/messages'] });

    // Show notification for new message
    if (payload.senderId !== user?.id) {
      toast({
        title: "New Message",
        description: "You have received a new message",
      });
    }
  };

  const handleActivityUpdate = (payload: any) => {
    // Invalidate relevant queries based on activity type
    switch (payload.activityType) {
      case 'project_update':
        queryClient.invalidateQueries({ queryKey: ['/api/projects', payload.projectId] });
        break;
      case 'document_upload':
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
        break;
      case 'client_update':
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        break;
    }
  };

  const handleMilestoneUpdate = (payload: any) => {
    // Invalidate milestone and project queries
    queryClient.invalidateQueries({ queryKey: ['/api/projects', payload.projectId] });
    queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });

    toast({
      title: "Milestone Update",
      description: `Project milestone has been ${payload.status}`,
    });
  };

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to send message. Please check your connection.",
      });
    }
  }, [toast]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}