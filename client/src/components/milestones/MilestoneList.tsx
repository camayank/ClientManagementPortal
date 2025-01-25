import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Milestone } from "@db/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
import { MilestoneUpdate } from "./MilestoneUpdate";

const statusColors = {
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  delayed: "bg-red-500",
} as const;

const priorityIcons = {
  low: Clock,
  medium: Calendar,
  high: AlertTriangle,
} as const;

interface Props {
  projectId: number;
}

export function MilestoneList({ projectId }: Props) {
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const { data: milestones, isLoading } = useQuery<Milestone[]>({
    queryKey: [`/api/projects/${projectId}/milestones`],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading">Loading milestones...</span>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones?.map((milestone) => {
              const StatusIcon = milestone.status === 'completed' ? CheckCircle : priorityIcons[milestone.priority || 'medium'];
              return (
                <TableRow key={milestone.id}>
                  <TableCell className="font-medium">{milestone.title}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[milestone.status || 'pending']}>
                      {(milestone.status || 'pending').replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-[100px]">
                      <Progress value={milestone.progress || 0} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <StatusIcon className="h-4 w-4" />
                      <span className="capitalize">{milestone.priority || 'medium'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(milestone.dueDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMilestone(milestone)}
                    >
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!milestones || milestones.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No milestones found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedMilestone} onOpenChange={() => setSelectedMilestone(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Milestone: {selectedMilestone?.title}</DialogTitle>
          </DialogHeader>
          {selectedMilestone && (
            <MilestoneUpdate
              projectId={projectId}
              milestone={selectedMilestone}
              onClose={() => setSelectedMilestone(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}