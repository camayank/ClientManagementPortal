import { ClientLayout } from "@/components/layouts/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderKanban,
  Clock,
  Activity,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { DashboardCardSkeleton } from "@/components/LoadingSkeletons";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  gradient?: string;
}

function StatCard({ title, value, description, icon: Icon, trend, gradient }: StatCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden",
      gradient
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          {description && (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <TrendingUp className="h-3 w-3" />
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientDashboard() {
  const { user } = useUser();

  // Fetch client-specific stats
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['/api/projects'],
  });

  const activeProjects = projects?.filter((p: any) => p.status === 'active')?.length || 0;
  const completedProjects = projects?.filter((p: any) => p.status === 'completed')?.length || 0;
  const totalProjects = projects?.length || 0;
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  return (
    <ClientLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's an overview of your projects and activities
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {loadingProjects ? (
            <>
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
              <DashboardCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Active Projects"
                value={activeProjects}
                description={`${totalProjects} total projects`}
                icon={FolderKanban}
                gradient="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
              />

              <StatCard
                title="Completed"
                value={completedProjects}
                description="Projects finished"
                icon={CheckCircle2}
                trend={{ value: 12, isPositive: true }}
                gradient="bg-gradient-to-br from-green-50 to-green-100 border-green-200"
              />

              <StatCard
                title="Completion Rate"
                value={`${completionRate}%`}
                description="Overall progress"
                icon={Activity}
                trend={{ value: 5, isPositive: true }}
                gradient="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
              />

              <StatCard
                title="Documents"
                value={0}
                description="Available to download"
                icon={FileText}
                gradient="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
              />
            </>
          )}
        </div>

        {/* Quick Actions Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No recent activity to display
              </p>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No upcoming deadlines
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
}
