import { ClientLayout } from "@/components/layouts/ClientLayout";
import { useQuery } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight } from "lucide-react";

type NewProjectForm = {
  name: string;
  lastDate: string;
};

export default function ClientProjects() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm<NewProjectForm>();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const onSubmit = async (data: NewProjectForm) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
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
            <DialogContent>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Add a new project to track your filings.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input 
                      id="name"
                      {...form.register("name", { required: true })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastDate">End Date</Label>
                    <Input 
                      id="lastDate"
                      type="date"
                      {...form.register("lastDate", { required: true })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Project</Button>
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