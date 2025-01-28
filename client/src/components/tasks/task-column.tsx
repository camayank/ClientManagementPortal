import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, AlertTriangle, User2 } from "lucide-react";
import type { Task } from "@db/schema";
import { format } from "date-fns";

interface TaskColumnProps {
  id: string;
  tasks: Task[];
}

export function TaskColumn({ id, tasks }: TaskColumnProps) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <SortableTask key={task.id} task={task} />
      ))}
    </div>
  );
}

interface SortableTaskProps {
  task: Task;
}

function SortableTask({ task }: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    low: "bg-blue-100 text-blue-800 border-blue-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    urgent: "bg-red-100 text-red-800 border-red-200",
  };

  const complexityBadges = {
    simple: "bg-green-100 text-green-800 border-green-200",
    moderate: "bg-blue-100 text-blue-800 border-blue-200",
    complex: "bg-purple-100 text-purple-800 border-purple-200",
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="font-medium flex-grow">{task.title}</h4>
          <div className="flex gap-1">
            <Badge
              variant="outline"
              className={`${priorityColors[task.priority as keyof typeof priorityColors]}`}
            >
              {task.priority}
            </Badge>
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          {task.assignedTo && (
            <div className="flex items-center gap-1">
              <User2 className="h-3 w-3" />
              <span>Assigned</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
            </div>
          )}
          {task.estimatedHours && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.estimatedHours}h</span>
            </div>
          )}
          {task.complexity && (
            <Badge
              variant="outline"
              className={`${complexityBadges[task.complexity as keyof typeof complexityBadges]}`}
            >
              {task.complexity}
            </Badge>
          )}
        </div>

        {task.taxYear && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-gray-100">
              Tax Year {task.taxYear}
            </Badge>
            {task.extensionRequested && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                Extended
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}