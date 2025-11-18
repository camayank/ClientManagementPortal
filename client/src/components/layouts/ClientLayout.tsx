import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  User,
  FolderKanban,
  ListTodo,
  CheckSquare,
  Clock,
  AlertTriangle,
  MessageSquare,
  Users2,
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
            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-md"
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

function ClientSidebar() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/client") {
      return location === "/client";
    }
    return location.startsWith(path);
  };

  return (
    <aside className="w-72 bg-white/90 backdrop-blur-sm border-r border-slate-200 shadow-lg">
      <div className="p-6 border-b border-slate-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
            <Users2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Client Portal</h2>
            <p className="text-xs text-slate-600">Your Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1.5 p-4 overflow-y-auto h-[calc(100vh-12rem)]">
        {/* Overview Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Overview</p>
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
        </div>

        {/* Projects & Work Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Projects & Work</p>
          <NavItem
            href="/client/projects"
            icon={FolderKanban}
            label="Projects"
            isActive={isActive("/client/projects")}
          />
          <NavItem
            href="/client/tasks"
            icon={ListTodo}
            label="Tasks"
            isActive={isActive("/client/tasks")}
          />
          <NavItem
            href="/client/documents"
            icon={FileText}
            label="Documents"
            isActive={isActive("/client/documents")}
          />
        </div>

        {/* Quality & Support Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quality & Support</p>
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
        </div>
      </nav>
    </aside>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <BaseLayout
      sidebar={<ClientSidebar />}
      className="p-8 bg-transparent"
      portalType="client"
    >
      {children}
    </BaseLayout>
  );
}