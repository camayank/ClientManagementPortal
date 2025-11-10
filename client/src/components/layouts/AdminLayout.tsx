import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  LogOut,
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

function AdminSidebar() {
  const { logout } = useUser();
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location === "/admin";
    }
    return location.startsWith(path);
  };

  return (
    <aside className="w-64 bg-white border-r shadow-sm">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Admin Portal
        </h1>
      </div>
      <nav className="space-y-1 p-2">
        <NavItem
          href="/admin"
          icon={LayoutDashboard}
          label="Dashboard"
          isActive={isActive("/admin")}
        />
        <NavItem
          href="/admin/clients"
          icon={Users}
          label="Clients"
          isActive={isActive("/admin/clients")}
        />
        <NavItem
          href="/admin/client-onboarding"
          icon={UserPlus}
          label="Onboarding"
          isActive={isActive("/admin/client-onboarding")}
        />
        <NavItem
          href="/admin/service-packages"
          icon={Package2}
          label="Service Packages"
          isActive={isActive("/admin/service-packages")}
        />
        <NavItem
          href="/admin/tasks"
          icon={ListTodo}
          label="Tasks"
          isActive={isActive("/admin/tasks")}
        />
        <NavItem
          href="/admin/work-allocation"
          icon={GanttChartSquare}
          label="Work Allocation"
          isActive={isActive("/admin/work-allocation")}
        />
        <NavItem
          href="/admin/quality-control"
          icon={CheckSquare}
          label="Quality Control"
          isActive={isActive("/admin/quality-control")}
        />
        <NavItem
          href="/admin/sla-management"
          icon={Clock}
          label="SLA Management"
          isActive={isActive("/admin/sla-management")}
        />
        <NavItem
          href="/admin/escalations"
          icon={AlertTriangle}
          label="Escalations"
          isActive={isActive("/admin/escalations")}
        />
        <NavItem
          href="/admin/compliance-calendar"
          icon={Calendar}
          label="Compliance Calendar"
          isActive={isActive("/admin/compliance-calendar")}
        />
        <NavItem
          href="/admin/documents"
          icon={FileText}
          label="Documents"
          isActive={isActive("/admin/documents")}
        />
        <NavItem
          href="/admin/credentials"
          icon={Key}
          label="Credentials"
          isActive={isActive("/admin/credentials")}
        />
        <NavItem
          href="/admin/reports"
          icon={FileSpreadsheet}
          label="Reports"
          isActive={isActive("/admin/reports")}
        />
        <NavItem
          href="/admin/user-roles"
          icon={Shield}
          label="User Roles"
          isActive={isActive("/admin/user-roles")}
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

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseLayout
      sidebar={<AdminSidebar />}
      className="p-8"
    >
      {children}
    </BaseLayout>
  );
}