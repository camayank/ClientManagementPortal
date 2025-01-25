import { ClientLayout } from "@/components/layouts/ClientLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@db/schema";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  lastDate: z.string().min(1, "End date is required"),
  initialMilestone: z.object({
    title: z.string().min(1, "Milestone title is required"),
    description: z.string().optional(),
    dueDate: z.string().min(1, "Due date is required"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
  }),
});

type NewProjectForm = z.infer<typeof projectSchema>;

export default function ClientProjects() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<NewProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      lastDate: "",
      initialMilestone: {
        title: "",
        description: "",
        dueDate: "",
        priority: "medium",
      },
    },
  });

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const createProject = useMutation({
    mutationFn: async (data: NewProjectForm) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: NewProjectForm) => {
    createProject.mutate(data);
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Your Projects</h1>
            <p className="text-muted-foreground">List of Your Projects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600">Add New Project</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Add a new project with initial milestone to track your progress.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Project Details</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input 
                        id="name"
                        {...form.register("name")}
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description"
                        {...form.register("description")}
                        placeholder="Describe the project..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastDate">Project End Date</Label>
                      <Input 
                        id="lastDate"
                        type="date"
                        {...form.register("lastDate")}
                      />
                      {form.formState.errors.lastDate && (
                        <p className="text-sm text-red-500">{form.formState.errors.lastDate.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Initial Milestone</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="milestoneTitle">Milestone Title</Label>
                      <Input 
                        id="milestoneTitle"
                        {...form.register("initialMilestone.title")}
                      />
                      {form.formState.errors.initialMilestone?.title && (
                        <p className="text-sm text-red-500">{form.formState.errors.initialMilestone.title.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="milestoneDescription">Description</Label>
                      <Textarea 
                        id="milestoneDescription"
                        {...form.register("initialMilestone.description")}
                        placeholder="Describe the milestone..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="milestoneDueDate">Due Date</Label>
                      <Input 
                        id="milestoneDueDate"
                        type="date"
                        {...form.register("initialMilestone.dueDate")}
                      />
                      {form.formState.errors.initialMilestone?.dueDate && (
                        <p className="text-sm text-red-500">{form.formState.errors.initialMilestone.dueDate.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="milestonePriority">Priority</Label>
                      <Select 
                        defaultValue="medium"
                        onValueChange={(value) => form.setValue("initialMilestone.priority", value as "low" | "medium" | "high")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createProject.isPending}
                  >
                    {createProject.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {projects?.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{project.name}</h3>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>Created On: {new Date(project.createdAt || '').toLocaleDateString()}</div>
                      <div>Last Date: {new Date(project.lastDate).toLocaleDateString()}</div>
                      <div>Assigned to: {project.assignedTo || 'Unassigned'}</div>
                      {project.description && (
                        <div className="mt-2">
                          <p className="line-clamp-2">{project.description}</p>
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-between"
                      onClick={() => window.location.href = `/client/projects/${project.id}`}
                    >
                      View Details
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}