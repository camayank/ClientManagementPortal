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
import type { Project, ProjectTemplate } from "@db/schema";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Loader2 } from "lucide-react";
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
import { addDays, format } from 'date-fns';
import { useAuth } from "@/hooks/use-auth";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  businessType: z.enum([
    "bookkeeping",
    "tax_return_preparation",
    "audit_assurance",
    "payroll_services",
    "financial_planning",
    "business_advisory",
    "irs_representation",
    "other"
  ], {
    required_error: "Business type is required",
  }),
  clientType: z.enum([
    "individual",
    "small_business",
    "corporation",
    "non_profit",
    "partnership",
    "trust_estate"
  ], {
    required_error: "Client type is required",
  }),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  estimatedHours: z.number().optional(),
  budget: z.number().optional(),
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
  const { isLoading: isAuthLoading } = useAuth();

  const form = useForm<NewProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      businessType: "bookkeeping",
      clientType: "individual",
      priority: "medium",
      estimatedHours: 0,
      budget: 0,
      lastDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      initialMilestone: {
        title: "",
        description: "",
        dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        priority: "medium",
      },
    },
  });

  const { data: projects, isLoading: isProjectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: !isAuthLoading,
  });

  const { data: templates } = useQuery<ProjectTemplate[]>({
    queryKey: ['/api/project-templates'],
    enabled: !isAuthLoading,
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

  const handleTemplateChange = (templateId: string) => {
    if (!templateId || !templates) {
      form.reset();
      return;
    }

    const template = templates.find(t => t.id === parseInt(templateId));
    if (template) {
      const firstMilestone = template.defaultMilestones?.[0];
      if (firstMilestone) {
        const dueDate = firstMilestone.dueDate.startsWith('relative:') 
          ? format(addDays(new Date(), parseInt(firstMilestone.dueDate.split('+')[1])), 'yyyy-MM-dd')
          : format(new Date(firstMilestone.dueDate), 'yyyy-MM-dd');

        form.reset({
          name: template.name,
          description: template.description || '',
          businessType: template.businessType,
          clientType: template.clientType,
          priority: template.priority || 'medium',
          estimatedHours: template.estimatedHours || 0,
          budget: template.budget || 0,
          lastDate: format(addDays(new Date(), 60), 'yyyy-MM-dd'),
          initialMilestone: {
            title: firstMilestone.title,
            description: firstMilestone.description || '',
            dueDate,
            priority: firstMilestone.priority || 'medium',
          },
        });
      }
    }
  };

  const onSubmit = (data: NewProjectForm) => {
    createProject.mutate(data);
  };

  if (isAuthLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Add a new project with business details and initial milestone.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-4">
                    <h3 className="text-lg font-semibold">Quick Start Templates</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="template">Choose a Template</Label>
                      <Select
                        onValueChange={handleTemplateChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template or start from scratch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Start from scratch</SelectItem>
                          {templates?.map(template => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select 
                        onValueChange={(value) => form.setValue("businessType", value as any)}
                        defaultValue={form.getValues("businessType")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bookkeeping">Bookkeeping</SelectItem>
                          <SelectItem value="tax_return_preparation">Tax Return Preparation</SelectItem>
                          <SelectItem value="audit_assurance">Audit & Assurance</SelectItem>
                          <SelectItem value="payroll_services">Payroll Services</SelectItem>
                          <SelectItem value="financial_planning">Financial Planning</SelectItem>
                          <SelectItem value="business_advisory">Business Advisory</SelectItem>
                          <SelectItem value="irs_representation">IRS Representation</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.businessType && (
                        <p className="text-sm text-red-500">{form.formState.errors.businessType.message}</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="clientType">Client Type</Label>
                      <Select 
                        onValueChange={(value) => form.setValue("clientType", value as any)}
                        defaultValue={form.getValues("clientType")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="small_business">Small Business</SelectItem>
                          <SelectItem value="corporation">Corporation</SelectItem>
                          <SelectItem value="non_profit">Non-Profit</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="trust_estate">Trust/Estate</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.clientType && (
                        <p className="text-sm text-red-500">{form.formState.errors.clientType.message}</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        onValueChange={(value) => form.setValue("priority", value as any)}
                        defaultValue={form.getValues("priority")}
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

                    <div className="grid gap-2">
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input 
                        id="estimatedHours"
                        type="number"
                        {...form.register("estimatedHours", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="budget">Budget ($)</Label>
                      <Input 
                        id="budget"
                        type="number"
                        {...form.register("budget", { valueAsNumber: true })}
                      />
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

        {isProjectsLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
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
                      <div>Created: {project.createdAt ? format(new Date(project.createdAt), 'MMM d, yyyy') : 'N/A'}</div>
                      <div>Due: {format(new Date(project.lastDate), 'MMM d, yyyy')}</div>
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