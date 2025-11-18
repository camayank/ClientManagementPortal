import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  FileText,
  ListTodo,
  FolderPlus,
  CalendarPlus,
  MessageSquarePlus,
  Users,
  Package,
} from "lucide-react";

export function QuickActions() {
  const [, setLocation] = useLocation();

  const navigate = (path: string) => {
    setLocation(path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
          <Plus className="h-4 w-4" />
          Quick Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/admin/client-onboarding")}>
            <UserPlus className="mr-2 h-4 w-4" />
            <span>New Client</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              N C
            </kbd>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate("/admin/tasks")}>
            <ListTodo className="mr-2 h-4 w-4" />
            <span>New Task</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              N T
            </kbd>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate("/admin/documents")}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Upload Document</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              N D
            </kbd>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>New Project</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/admin/service-packages")}>
            <Package className="mr-2 h-4 w-4" />
            <span>Service Package</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate("/admin/compliance-calendar")}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            <span>Compliance Event</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate("/admin/escalations")}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            <span>Escalation</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate("/admin/user-roles")}>
            <Users className="mr-2 h-4 w-4" />
            <span>User Role</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
