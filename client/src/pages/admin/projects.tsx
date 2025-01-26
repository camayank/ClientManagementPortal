import { AdminLayout } from "@/components/layouts/AdminLayout";
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
import type { Project, ProjectTemplate, Client } from "@db/schema";
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
import { addDays, format } from 'date-fns';

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  businessType: z.enum([
    "individual_tax_return",
    "corporate_tax_return",
    "partnership_tax_return",
    "trust_tax_return",
    "financial_statement_audit",
    "financial_statement_review",
    "financial_statement_compilation",
    "bookkeeping_monthly",
    "bookkeeping_quarterly",
    "payroll_services",
    "tax_planning",
    "irs_representation",
    "business_advisory",
    "other"
  ], {
    required_error: "Business type is required",
  }),
  clientId: z.string().min(1, "Client is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  estimatedHours: z.string().transform(val => parseInt(val) || 0).optional(),
  budget: z.string().transform(val => parseInt(val) || 0).optional(),
  lastDate: z.string().min(1, "End date is required"),
  initialMilestone: z.object({
    title: z.string().min(1, "Milestone title is required"),
    description: z.string().optional(),
    dueDate: z.string().min(1, "Due date is required"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
  }),
});

type NewProjectForm = z.infer<typeof projectSchema>;

export default function AdminProjects() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<NewProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      businessType: "individual_tax_return",
      clientId: "",
      priority: "medium",
      estimatedHours: "",
      budget: "",
      lastDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      initialMilestone: {
        title: "",
        description: "",
        dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        priority: "medium",
      },
    },
  });

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: templates } = useQuery<ProjectTemplate[]>({
    queryKey: ['/api/project-templates'],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
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
    if (!templateId) {
      form.reset();
      return;
    }

    const template = templates?.find(t => t.id === parseInt(templateId));
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
          clientId: form.getValues("clientId"), // Preserve selected client
          priority: template.priority || 'medium',
          estimatedHours: template.estimatedHours?.toString() || '',
          budget: template.budget?.toString() || '',
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">All Projects</h1>
            <p className="text-muted-foreground">Manage Client Projects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600">Create New Project</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new project and assign it to a client.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="clientId">Select Client</Label>
                      <Select
                        onValueChange={(value) => form.setValue("clientId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map(client => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.company}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.clientId && (
                        <p className="text-sm text-red-500">{form.formState.errors.clientId.message}</p>
                      )}
                    </div>

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
                      <Label htmlFor="businessType">Service Type</Label>
                      <Select 
                        onValueChange={(value) => form.setValue("businessType", value as any)}
                        defaultValue={form.getValues("businessType")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual_tax_return">Individual Tax Return</SelectItem>
                          <SelectItem value="corporate_tax_return">Corporate Tax Return</SelectItem>
                          <SelectItem value="partnership_tax_return">Partnership Tax Return</SelectItem>
                          <SelectItem value="trust_tax_return">Trust Tax Return</SelectItem>
                          <SelectItem value="financial_statement_audit">Financial Statement Audit</SelectItem>
                          <SelectItem value="financial_statement_review">Financial Statement Review</SelectItem>
                          <SelectItem value="financial_statement_compilation">Financial Statement Compilation</SelectItem>
                          <SelectItem value="bookkeeping_monthly">Monthly Bookkeeping</SelectItem>
                          <SelectItem value="bookkeeping_quarterly">Quarterly Bookkeeping</SelectItem>
                          <SelectItem value="payroll_services">Payroll Services</SelectItem>
                          <SelectItem value="tax_planning">Tax Planning</SelectItem>
                          <SelectItem value="irs_representation">IRS Representation</SelectItem>
                          <SelectItem value="business_advisory">Business Advisory</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.formState.errors.businessType && (
                        <p className="text-sm text-red-500">{form.formState.errors.businessType.message}</p>
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
                        {...form.register("estimatedHours")}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="budget">Budget ($)</Label>
                      <Input 
                        id="budget"
                        type="number"
                        {...form.register("budget")}
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
                      onClick={() => window.location.href = `/admin/projects/${project.id}`}
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
    </AdminLayout>
  );
}
