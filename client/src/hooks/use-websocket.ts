import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: 'notification' | 'chat' | 'activity';
  payload: any;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Create WebSocket connection
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'notification':
            // Show notification toast
            toast({
              title: "New Notification",
              description: message.payload.message,
            });

            // Invalidate relevant queries based on notification type
            if (message.payload.type === 'document_upload') {
              queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
            }
            break;
          // Add other message type handlers here
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (user) {
          wsRef.current = new WebSocket(`ws://${window.location.host}/ws`);
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
