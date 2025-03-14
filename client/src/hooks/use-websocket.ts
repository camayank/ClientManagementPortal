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
      // Construct WebSocket URL based on current protocol and host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established');
        reconnectAttempts.current = 0;
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
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to establish real-time connection",
        });
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        wsRef.current = null;

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          toast({
            title: "Connection Lost",
            description: "Real-time connection lost. Reconnecting...",
            duration: 3000,
          });

          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts.current)); // Exponential backoff
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

  const handleNotification = useCallback((payload: any) => {
    toast({
      title: payload.type === 'error' ? "Error" : "Notification",
      description: payload.message,
      variant: payload.type === 'error' ? "destructive" : "default",
    });
  }, [toast]);

  const handleChatMessage = useCallback((payload: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/messages'] });

    if (payload.senderId !== user?.id) {
      toast({
        title: "New Message",
        description: "You have received a new message",
      });
    }
  }, [queryClient, toast, user?.id]);

  const handleActivityUpdate = useCallback((payload: any) => {
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
  }, [queryClient]);

  const handleMilestoneUpdate = useCallback((payload: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/projects', payload.projectId] });
    queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });

    toast({
      title: "Milestone Update",
      description: `Project milestone has been ${payload.status}`,
    });
  }, [queryClient, toast]);

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