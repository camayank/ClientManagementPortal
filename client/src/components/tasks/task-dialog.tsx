import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskCategory, User, Client } from "@db/schema";
import { Switch } from "@/components/ui/switch";

interface TaskDialogProps {
  task?: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDialog({ task, open, onOpenChange }: TaskDialogProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [categoryId, setCategoryId] = useState<string>(task?.categoryId?.toString() ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "medium");
  const [complexity, setComplexity] = useState(task?.complexity ?? "moderate");
  const [clientId, setClientId] = useState<string>(task?.clientId?.toString() ?? "");
  const [assignedTo, setAssignedTo] = useState<string>(task?.assignedTo?.toString() ?? "");
  const [reviewerId, setReviewerId] = useState<string>(task?.reviewerId?.toString() ?? "");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.dueDate ? new Date(task.dueDate) : undefined
  );
  const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours?.toString() ?? "");
  const [taxYear, setTaxYear] = useState(task?.taxYear?.toString() ?? new Date().getFullYear().toString());
  const [extensionRequested, setExtensionRequested] = useState(task?.extensionRequested ?? false);
  const [extensionDeadline, setExtensionDeadline] = useState<Date | undefined>(
    task?.extensionDeadline ? new Date(task.extensionDeadline) : undefined
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories } = useQuery<TaskCategory[]>({
    queryKey: ["/api/task-categories"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const taskData = {
      title,
      description,
      categoryId: categoryId ? parseInt(categoryId) : null,
      clientId: clientId ? parseInt(clientId) : null,
      assignedTo: assignedTo ? parseInt(assignedTo) : null,
      reviewerId: reviewerId ? parseInt(reviewerId) : null,
      priority,
      complexity,
      dueDate,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      taxYear: taxYear ? parseInt(taxYear) : null,
      extensionRequested,
      extensionDeadline,
    };

    try {
      const response = await fetch(task ? `/api/tasks/${task.id}` : "/api/tasks", {
        method: task ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: task ? "Task Updated" : "Task Created",
        description: task
          ? "Your task has been updated successfully."
          : "Your new task has been created successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save task:", error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={clientId}
                onValueChange={setClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.company || `Client #${client.id}`}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select
                value={assignedTo}
                onValueChange={setAssignedTo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName || user.username}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewer">Reviewer</Label>
              <Select
                value={reviewerId}
                onValueChange={setReviewerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reviewer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {users?.filter(u => ["manager", "partner", "quality_reviewer"].includes(u.role))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.fullName || user.username}
                        </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complexity">Complexity</Label>
              <Select value={complexity} onValueChange={setComplexity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxYear">Tax Year</Label>
              <Input
                id="taxYear"
                type="number"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !dueDate && "text-muted-foreground"
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>

            <div className="space-y-2 flex items-center">
              <Label htmlFor="extensionRequested" className="flex-grow">Extension Requested</Label>
              <Switch
                id="extensionRequested"
                checked={extensionRequested}
                onCheckedChange={setExtensionRequested}
              />
            </div>

            {extensionRequested && (
              <div className="space-y-2">
                <Label htmlFor="extensionDeadline">Extension Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !extensionDeadline && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {extensionDeadline ? format(extensionDeadline, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={extensionDeadline}
                      onSelect={setExtensionDeadline}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{task ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}