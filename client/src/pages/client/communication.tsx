import { ClientLayout } from "@/components/layouts/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Users, Clock, Bell, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface CommunicationStats {
  unreadMessages: number;
  totalMessages: number;
  availableTeamMembers: number;
  averageResponseTime: number;
  notifications: number;
}

export default function ClientCommunication() {
  const { isLoading: isAuthLoading } = useAuth();

  const { data: stats, isLoading: isStatsLoading } = useQuery<CommunicationStats>({
    queryKey: ['/api/communication/stats'],
    enabled: !isAuthLoading,
  });

  if (isAuthLoading || isStatsLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6 p-6 pb-16">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Communication</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your communications and stay updated with your service providers.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.unreadMessages || 0} unread
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.availableTeamMembers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Available to chat
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.averageResponseTime || 0}m</div>
              <p className="text-xs text-muted-foreground mt-1">
                Average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.notifications || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Communication Center</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Communication features will be implemented here, including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Real-time messaging</li>
              <li>File sharing</li>
              <li>Video conferencing</li>
              <li>Team collaboration tools</li>
              <li>Message history and search</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}