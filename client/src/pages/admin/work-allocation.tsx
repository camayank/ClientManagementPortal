import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GanttChartSquare, Users, Calendar, AlertCircle, Search } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Tooltip } from "@/components/ui/tooltip";

// Types for our work allocation system
interface WorkloadMetrics {
  activeAssignments: number;
  dueThisWeek: number;
  availableTeamMembers: number;
  scheduledTasks: number;
  urgentTasks: number;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  workflowPosition: string;
  experienceLevel: string;
  location: string;
  currentLoad: number;
  availableHours: number;
}

interface TableColumn {
  accessorKey: keyof TeamMember | 'actions';
  header: string;
  cell?: (props: { row: { original: TeamMember } }) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
}

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
      const response = await fetch(`/api/analytics/team-members?role=${filterRole}&location=${filterLocation}`);
      if (!response.ok) throw new Error("Failed to fetch team members");
      return response.json();
    }
  });

  const columns: TableColumn[] = [
    {
      accessorKey: "name",
      header: "Name",
      sortable: true,
      searchable: true,
    },
    {
      accessorKey: "role",
      header: "Role",
      sortable: true,
      cell: ({ row }) => (
        <Badge variant={getBadgeVariant(row.original.role)}>{row.original.role}</Badge>
      ),
    },
    {
      accessorKey: "workflowPosition",
      header: "Workflow Position",
      sortable: true,
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.workflowPosition}
        </Badge>
      ),
    },
    {
      accessorKey: "experienceLevel",
      header: "Experience",
      sortable: true,
    },
    {
      accessorKey: "location",
      header: "Location",
      sortable: true,
    },
    {
      accessorKey: "currentLoad",
      header: "Workload",
      sortable: true,
      cell: ({ row }) => (
        <Tooltip content={`${row.original.availableHours}h available this week`}>
          <div className="w-full space-y-1">
            <Progress value={row.original.currentLoad} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {row.original.currentLoad}% utilized
            </p>
          </div>
        </Tooltip>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleAssignTask(row.original.id)}
            disabled={row.original.currentLoad >= 100}
          >
            Assign Task
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.original.id)}
          >
            View Details
          </Button>
        </div>
      ),
    },
  ];

  const handleAssignTask = (userId: number) => {
    // This will be implemented with the task assignment modal
    console.log("Assigning task to user:", userId);
  };

  const handleViewDetails = (userId: number) => {
    // This will show a detailed view of the team member's workload
    console.log("Viewing details for user:", userId);
  };

  const getBadgeVariant = (role: string): "default" | "destructive" | "outline" | "secondary" => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      us_office_senior: "default",
      us_remote_senior: "default",
      offshore_team_lead: "secondary",
      outsource_lead: "outline",
      maker: "default",
      checker: "secondary",
      reviewer: "outline",
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
                pageSize={10}
                searchable
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}