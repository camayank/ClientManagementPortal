import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
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
  Building2,
} from "lucide-react";
import { BaseLayout } from "./BaseLayout";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  badge?: string;
}

function NavItem({ href, icon: Icon, label, isActive, badge }: NavItemProps) {
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-11 px-3 transition-all duration-200 group",
          isActive
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md"
            : "hover:bg-slate-100 text-slate-700 hover:text-slate-900"
        )}
      >
        <Icon className={cn(
          "h-5 w-5 transition-transform group-hover:scale-110",
          isActive ? "text-white" : "text-slate-500"
        )} />
        <span className="flex-1 text-left font-medium">{label}</span>
        {badge && (
          <Badge variant={isActive ? "secondary" : "outline"} className="ml-auto">
            {badge}
          </Badge>
        )}
      </Button>
    </Link>
  );
}

function AdminSidebar() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location === "/admin";
    }
    return location.startsWith(path);
  };

  return (
    <aside className="w-72 bg-white/90 backdrop-blur-sm border-r border-slate-200 shadow-lg">
      <div className="p-6 border-b border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Admin Portal</h2>
            <p className="text-xs text-slate-600">Management Console</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1.5 p-4 overflow-y-auto h-[calc(100vh-12rem)]">
        {/* Core Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Core</p>
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
        </div>

        {/* Services Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Services</p>
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
        </div>

        {/* Quality & Compliance Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quality & Compliance</p>
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
        </div>

        {/* Resources Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resources</p>
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
        </div>
      </nav>
    </aside>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseLayout
      sidebar={<AdminSidebar />}
      className="p-8 bg-transparent"
      portalType="admin"
    >
      {children}
    </BaseLayout>
  );
}