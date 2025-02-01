```typescript
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export function useProjectSync(projectId?: number) {
  const { sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!isConnected || !projectId || !user) return;

    // Subscribe to project updates
    sendMessage({
      type: 'activity',
      payload: {
        projectId,
        activityType: 'subscribe',
        data: { userId: user.id }
      }
    });

    // Handle cleanup
    return () => {
      sendMessage({
        type: 'activity',
        payload: {
          projectId,
          activityType: 'unsubscribe',
          data: { userId: user.id }
        }
      });
    };
  }, [isConnected, projectId, user, sendMessage]);

  // Function to broadcast project updates
  const broadcastUpdate = async (updateType: string, data: any) => {
    if (!isConnected || !projectId) return;

    sendMessage({
      type: 'activity',
      payload: {
        projectId,
        activityType: updateType,
        data
      }
    });

    // Optimistically update the cache
    await queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
  };

  // Function to broadcast milestone updates
  const broadcastMilestoneUpdate = async (milestoneId: number, status: string, description?: string) => {
    if (!isConnected || !projectId) return;

    sendMessage({
      type: 'milestone_updated',
      payload: {
        projectId,
        milestoneId,
        status,
        description
      }
    });

    toast({
      title: "Milestone Updated",
      description: `Project milestone status changed to ${status}`,
    });

    // Invalidate relevant queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] })
    ]);
  };

  return {
    broadcastUpdate,
    broadcastMilestoneUpdate
  };
}
```
