import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  FolderKanban,
  Activity,
  FileText,
  UserCheck,
  AlertTriangle,
  Settings,
  UserCircle,
  TrendingUp,
  TrendingDown,
  Plus
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  gradient?: string;
}

function StatCard({ title, value, description, icon: Icon, trend, gradient }: StatCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer",
      gradient
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn(
          "rounded-full p-2",
          gradient ? "bg-white/50" : "bg-muted"
        )}>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  const { user } = useUser();
  const hasRoleAccess = user?.role === 'admin';

  return (
    <AdminLayout>
      <div className="space-y-6 p-6 pb-16">
        <header className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Admin Portal
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your organization's roles, users, and system settings.
              </p>
            </div>
            {hasRoleAccess && (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" asChild className="h-10">
                  <Link href="/admin/roles" className="inline-flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Roles
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-10">
                  <Link href="/admin/user-roles" className="inline-flex items-center">
                    <UserCircle className="mr-2 h-4 w-4" />
                    User Roles
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </header>

        {isLoading ? (
          <DashboardSkeleton />
        ) : stats && Object.keys(stats).length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Clients"
              value={stats?.totalClients || 0}
              description={`${stats?.newClients || 0} new this month`}
              icon={Users}
              trend={{ value: 12, isPositive: true }}
              gradient="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
            />

            <StatCard
              title="Active Projects"
              value={stats?.activeProjects || 0}
              description={`${stats?.completedProjects || 0} completed this month`}
              icon={FolderKanban}
              trend={{ value: 8, isPositive: true }}
              gradient="bg-gradient-to-br from-green-50 to-green-100 border-green-200"
            />

            <StatCard
              title="Pending Reviews"
              value={stats?.pendingReviews || 0}
              description={`From ${stats?.clientsWithPending || 0} clients`}
              icon={FileText}
              gradient="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
            />

            <StatCard
              title="Active Users"
              value={stats?.activeUsers || 0}
              description="Online in last 24 hours"
              icon={UserCheck}
              trend={{ value: 5, isPositive: true }}
              gradient="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
            />

            <StatCard
              title="System Health"
              value="98%"
              description="All systems operational"
              icon={Activity}
              trend={{ value: 2, isPositive: true }}
              gradient="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200"
            />

            <StatCard
              title="Pending Actions"
              value={stats?.pendingActions || 0}
              description="Require immediate attention"
              icon={AlertTriangle}
              gradient="bg-gradient-to-br from-red-50 to-red-100 border-red-200"
            />
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No Data Available"
            description="Start by adding clients and projects to see your dashboard metrics come to life"
            action={
              <Button asChild>
                <Link href="/admin/clients">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Client
                </Link>
              </Button>
            }
          />
        )}

        {/* Future charts and analytics section */}
        {stats && Object.keys(stats).length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Placeholder for future charts */}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}