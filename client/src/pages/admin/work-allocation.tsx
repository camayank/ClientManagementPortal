import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GanttChartSquare, Users, Calendar, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

// Types for our work allocation system
type WorkloadMetrics = {
  activeAssignments: number;
  dueThisWeek: number;
  availableTeamMembers: number;
  scheduledTasks: number;
  averageTaskTime: number;
  urgentTasks: number;
};

type TeamMember = {
  id: number;
  name: string;
  role: string;
  workflowPosition: string;
  experienceLevel: string;
  location: string;
  currentLoad: number;
  availableHours: number;
};

export default function WorkAllocation() {
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");

  // Fetch workload metrics
  const { data: metrics } = useQuery<WorkloadMetrics>({
    queryKey: ["workloadMetrics"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/workload-metrics");
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    }
  });

  // Fetch team members with their current workload
  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ["teamMembers", filterRole, filterLocation],
    queryFn: async () => {
      const response = await fetch(`/api/team-members?role=${filterRole}&location=${filterLocation}`);
      if (!response.ok) throw new Error("Failed to fetch team members");
      return response.json();
    }
  });

  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={getBadgeVariant(row.original.role)}>{row.original.role}</Badge>
      ),
    },
    {
      accessorKey: "workflowPosition",
      header: "Workflow Position",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.workflowPosition}</Badge>
      ),
    },
    {
      accessorKey: "experienceLevel",
      header: "Experience",
    },
    {
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "currentLoad",
      header: "Current Load",
      cell: ({ row }) => (
        <div className="w-full bg-secondary rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full" 
            style={{ width: `${row.original.currentLoad}%` }}
          />
        </div>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => handleAssignTask(row.original.id)}>
          Assign Task
        </Button>
      ),
    },
  ];

  const handleAssignTask = (userId: number) => {
    // This will be implemented with the task assignment modal
    console.log("Assigning task to user:", userId);
  };

  const getBadgeVariant = (role: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      us_office_senior: "default",
      us_remote_senior: "default",
      offshore_team_lead: "secondary",
      outsource_lead: "outline",
    };
    return variants[role] || "default";
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6 pb-16">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Work Allocation</h1>
            <div className="flex gap-4">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="us_office">US Office</SelectItem>
                  <SelectItem value="us_remote">US Remote</SelectItem>
                  <SelectItem value="offshore">Offshore</SelectItem>
                  <SelectItem value="outsource">Outsource</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="us_office">US Office</SelectItem>
                  <SelectItem value="us_remote">US Remote</SelectItem>
                  <SelectItem value="offshore">Offshore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-muted-foreground">
            Manage and optimize work distribution across your team based on roles, experience, and location.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
              <GanttChartSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.activeAssignments || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.dueThisWeek || 0} due this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Available Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.availableTeamMembers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all locations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Scheduled Tasks</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.scheduledTasks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                For next week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Urgent Tasks</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.urgentTasks || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Require immediate attention
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Team Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers && (
              <DataTable
                columns={columns}
                data={teamMembers}
                pagination
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}