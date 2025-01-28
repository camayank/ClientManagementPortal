import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { DashboardConfig, DashboardWidget } from "@db/schema";
import { DragDropContext, Droppable, Draggable } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';

type WidgetProps = {
  widget: DashboardWidget;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

function Widget({ widget, onEdit, onDelete }: WidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: widget.id.toString(),
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{widget.title}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(widget.id)}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(widget.id)}>
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Type: {widget.type} | Size: {widget.size}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardConfig() {
  const [name, setName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createDashboard = useMutation({
    mutationFn: async (data: Partial<DashboardConfig>) => {
      const response = await fetch("/api/analytics/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards"] });
      toast({
        title: "Success",
        description: "Dashboard created successfully",
      });
      setName("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDashboard.mutate({
      name,
      layout: {},
      isDefault: false,
    });
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create New Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Dashboard Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Dashboard"
              />
            </div>
            <Button type="submit" disabled={createDashboard.isPending}>
              {createDashboard.isPending ? "Creating..." : "Create Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
