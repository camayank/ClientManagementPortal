import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  LogOut,
  FileText,
  User,
  FolderKanban,
  ListTodo,
  CheckSquare,
  Clock,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { BaseLayout } from "./BaseLayout";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
}

function NavItem({ href, icon: Icon, label, isActive }: NavItemProps) {
  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start transition-all duration-200",
          isActive && "bg-primary/10 text-primary font-semibold shadow-sm"
        )}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}

function ClientSidebar() {
  const { logout } = useUser();
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/client") {
      return location === "/client";
    }
    return location.startsWith(path);
  };

  return (
    <aside className="w-64 bg-white border-r shadow-sm">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Client Portal
        </h1>
      </div>
      <nav className="space-y-1 p-2">
        <NavItem
          href="/client"
          icon={LayoutDashboard}
          label="Dashboard"
          isActive={isActive("/client")}
        />
        <NavItem
          href="/client/personal-info"
          icon={User}
          label="Personal Info"
          isActive={isActive("/client/personal-info")}
        />
        <NavItem
          href="/client/projects"
          icon={FolderKanban}
          label="Projects"
          isActive={isActive("/client/projects")}
        />
        <NavItem
          href="/client/documents"
          icon={FileText}
          label="Documents"
          isActive={isActive("/client/documents")}
        />
        <NavItem
          href="/client/tasks"
          icon={ListTodo}
          label="Tasks"
          isActive={isActive("/client/tasks")}
        />
        <NavItem
          href="/client/quality-reviews"
          icon={CheckSquare}
          label="Quality Reviews"
          isActive={isActive("/client/quality-reviews")}
        />
        <NavItem
          href="/client/sla"
          icon={Clock}
          label="SLA Tracking"
          isActive={isActive("/client/sla")}
        />
        <NavItem
          href="/client/support"
          icon={AlertTriangle}
          label="Support"
          isActive={isActive("/client/support")}
        />
        <NavItem
          href="/client/communication"
          icon={MessageSquare}
          label="Communication"
          isActive={isActive("/client/communication")}
        />

        <div className="pt-4 mt-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </nav>
    </aside>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseLayout
      sidebar={<ClientSidebar />}
      className="p-8"
    >
      {children}
    </BaseLayout>
  );
}