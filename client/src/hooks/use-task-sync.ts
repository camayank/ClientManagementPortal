```typescript
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface TaskUpdate {
  taskId: number;
  status?: string;
  assignedTo?: number;
  priority?: string;
  estimatedHours?: number;
  description?: string;
}

export function useTaskSync(projectId?: number) {
  const { sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!isConnected || !user) return;

    // Subscribe to task updates for the project or user's tasks
    sendMessage({
      type: 'activity',
      payload: {
        activityType: 'subscribe_tasks',
        data: {
          userId: user.id,
          projectId
        }
      }
    });

    return () => {
      sendMessage({
        type: 'activity',
        payload: {
          activityType: 'unsubscribe_tasks',
          data: {
            userId: user.id,
            projectId
          }
        }
      });
    };
  }, [isConnected, projectId, user, sendMessage]);

  // Function to broadcast task updates
  const broadcastTaskUpdate = async (taskId: number, update: TaskUpdate) => {
    if (!isConnected) return;

    sendMessage({
      type: 'activity',
      payload: {
        activityType: 'task_update',
        data: {
          taskId,
          ...update,
          updatedBy: user?.id
        }
      }
    });

    // Show notification for task updates
    toast({
      title: "Task Updated",
      description: `Task #${taskId} has been updated`,
    });

    // Invalidate relevant queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId] }),
      projectId && queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] })
    ].filter(Boolean));
  };

  // Function to broadcast task assignment
  const broadcastTaskAssignment = async (taskId: number, assignedTo: number) => {
    if (!isConnected) return;

    sendMessage({
      type: 'activity',
      payload: {
        activityType: 'task_assignment',
        data: {
          taskId,
          assignedTo,
          assignedBy: user?.id
        }
      }
    });

    toast({
      title: "Task Assigned",
      description: `Task #${taskId} has been assigned`,
    });

    await queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  };

  // Function to broadcast task status change
  const broadcastTaskStatusChange = async (taskId: number, status: string) => {
    if (!isConnected) return;

    sendMessage({
      type: 'activity',
      payload: {
        activityType: 'task_status_change',
        data: {
          taskId,
          status,
          updatedBy: user?.id
        }
      }
    });

    toast({
      title: "Task Status Updated",
      description: `Task #${taskId} status changed to ${status}`,
    });

    await queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  };

  return {
    broadcastTaskUpdate,
    broadcastTaskAssignment,
    broadcastTaskStatusChange
  };
}
```
