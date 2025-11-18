import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Users, RefreshCw, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "./task-dialog";
import { TaskColumn } from "./task-column";
import { useState } from "react";
import type { Task } from "@db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const COLUMNS = [
  { id: "todo", name: "To Do" },
  { id: "in_progress", name: "In Progress" },
  { id: "in_review", name: "In Review" },
  { id: "blocked", name: "Blocked" },
  { id: "completed", name: "Completed" },
];

export function TaskBoard() {
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ taskIds, updates }: { taskIds: number[], updates: any }) => {
      return apiRequest("/api/tasks/bulk-update", {
        method: "PATCH",
        body: JSON.stringify({ taskIds, updates }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSelectedTaskIds(new Set());
      toast({
        title: "Tasks Updated",
        description: `${selectedTaskIds.size} task(s) updated successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tasks. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (taskIds: number[]) => {
      return apiRequest("/api/tasks/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({ taskIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSelectedTaskIds(new Set());
      toast({
        title: "Tasks Deleted",
        description: `${selectedTaskIds.size} task(s) deleted successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tasks. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleTaskSelection = (taskId: number) => {
    const newSelection = new Set(selectedTaskIds);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTaskIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === tasks?.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks?.map(t => t.id) ?? []));
    }
  };

  const handleBulkStatusUpdate = (status: string) => {
    bulkUpdateMutation.mutate({
      taskIds: Array.from(selectedTaskIds),
      updates: { status },
    });
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedTaskIds));
    setBulkDeleteDialogOpen(false);
  };

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const taskId = active.id;
    const newStatus = over.id as string;

    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          comment: `Status updated to ${newStatus}`,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Task Updated",
        description: "Task status has been updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update task status:", error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Board</h1>
        <Button onClick={() => setIsNewTaskDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {COLUMNS.map((column) => (
            <Card key={column.id} className="p-4">
              <h3 className="font-semibold mb-4">{column.name}</h3>
              <TaskColumn
                id={column.id}
                tasks={tasks?.filter((task) => task.status === column.id) ?? []}
                onTaskClick={setSelectedTask}
              />
            </Card>
          ))}
        </div>
      </DndContext>

      <TaskDialog
        open={isNewTaskDialogOpen}
        onOpenChange={setIsNewTaskDialogOpen}
      />
      
      <TaskDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask || undefined}
      />
    </div>
  );
}
