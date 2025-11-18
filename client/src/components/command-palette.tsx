import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  FileText,
  Key,
  FileSpreadsheet,
  UserPlus,
  Package2,
  Shield,
  ListTodo,
  GanttChartSquare,
  CheckSquare,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  FolderKanban,
  MessageSquare,
  Search,
  Settings,
  HelpCircle,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const navigate = (path: string) => {
    setLocation(path);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => navigate("/admin/client-onboarding")}>
            <UserPlus className="mr-2 h-4 w-4" />
            <span>New Client Onboarding</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/tasks")}>
            <ListTodo className="mr-2 h-4 w-4" />
            <span>Create Task</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/documents")}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Upload Document</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Admin Portal">
          <CommandItem onSelect={() => navigate("/admin")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/clients")}>
            <Users className="mr-2 h-4 w-4" />
            <span>Clients</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/service-packages")}>
            <Package2 className="mr-2 h-4 w-4" />
            <span>Service Packages</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/tasks")}>
            <ListTodo className="mr-2 h-4 w-4" />
            <span>Tasks</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/work-allocation")}>
            <GanttChartSquare className="mr-2 h-4 w-4" />
            <span>Work Allocation</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/quality-control")}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>Quality Control</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/sla-management")}>
            <Clock className="mr-2 h-4 w-4" />
            <span>SLA Management</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/escalations")}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            <span>Escalations</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/compliance-calendar")}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Compliance Calendar</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/documents")}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Documents</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/credentials")}>
            <Key className="mr-2 h-4 w-4" />
            <span>Credentials</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/reports")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            <span>Reports</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/admin/user-roles")}>
            <Shield className="mr-2 h-4 w-4" />
            <span>User Roles</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Client Portal">
          <CommandItem onSelect={() => navigate("/client")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/client/personal-info")}>
            <User className="mr-2 h-4 w-4" />
            <span>Personal Info</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/client/projects")}>
            <FolderKanban className="mr-2 h-4 w-4" />
            <span>Projects</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/client/documents")}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Documents</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/client/tasks")}>
            <ListTodo className="mr-2 h-4 w-4" />
            <span>Tasks</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/client/quality-reviews")}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>Quality Reviews</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/client/sla")}>
            <Clock className="mr-2 h-4 w-4" />
            <span>SLA Tracking</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/client/support")}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            <span>Support</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/client/communication")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>Communication</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Documentation</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
