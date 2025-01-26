import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import type { Task } from "@db/schema";

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
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
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
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{task.title}</h4>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              priorityColors[task.priority as keyof typeof priorityColors]
            }`}
          >
            {task.priority}
          </span>
        </div>
        {task.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
        )}
        {task.dueDate && (
          <p className="text-xs text-gray-500">
            Due: {new Date(task.dueDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </Card>
  );
}
