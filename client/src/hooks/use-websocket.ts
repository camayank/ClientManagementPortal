import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  event: string;
  payload: any;
}

class EnhancedWebSocket extends WebSocket {
  emit(event: string, payload: any) {
    this.send(JSON.stringify({ event, payload }));
  }

  on(event: string, callback: (data: any) => void) {
    const handler = (e: MessageEvent) => {
      const message: WebSocketMessage = JSON.parse(e.data);
      if (message.event === event) {
        callback(message.payload);
      }
    };
    this.addEventListener('message', handler);
    return () => this.removeEventListener('message', handler);
  }

  off(event: string) {
    this.removeEventListener(event, () => {});
  }
}

export function useWebSocket() {
  const wsRef = useRef<EnhancedWebSocket | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Create WebSocket connection
    const ws = new EnhancedWebSocket(`ws://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
      ws.emit('auth', { userId: user.id });
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'notification':
            toast({
              title: "New Notification",
              description: message.payload.message,
            });
            // Invalidate relevant queries
            if (message.payload.type === 'message') {
              queryClient.invalidateQueries({ queryKey: ['/api/communication/messages'] });
            }
            break;
          case 'chat':
            queryClient.invalidateQueries({ queryKey: ['/api/communication/messages'] });
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
        description: "Failed to establish real-time connection. Retrying..."
      });
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      toast({
        title: "Connection Lost",
        description: "Real-time connection lost. Reconnecting..."
      });
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (user) {
          wsRef.current = new EnhancedWebSocket(`ws://${window.location.host}/ws`);
        }
      }, 5000);
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user, toast, queryClient]);

  return wsRef.current;
}