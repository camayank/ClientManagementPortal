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
  UserCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useUser } from "@/hooks/use-user";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  const { user } = useUser();
  const hasRoleAccess = user?.role === 'admin';

  return (
    <AdminLayout>
      <div className="space-y-6 p-6 pb-16">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
            {hasRoleAccess && (
              <div className="flex items-center gap-4">
                <Button variant="outline" asChild className="h-10">
                  <Link href="/admin/roles" className="inline-flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Role Management
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-10">
                  <Link href="/admin/user-roles" className="inline-flex items-center">
                    <UserCircle className="mr-2 h-5 w-5" />
                    User Role Assignment
                  </Link>
                </Button>
              </div>
            )}
          </div>
          <p className="text-muted-foreground">
            Manage your organization's roles, users, and system settings.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.newClients || 0} new this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeProjects || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.completedProjects || 0} completed this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingReviews || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {stats?.clientsWithPending || 0} clients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Online in last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98%</div>
              <p className="text-xs text-muted-foreground mt-1">
                All systems operational
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingActions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Require immediate attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Future charts and analytics section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Add charts here when needed */}
        </div>
      </div>
    </AdminLayout>
  );
}