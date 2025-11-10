import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, AlertTriangle, CheckCircle, Clock, Filter, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ComplianceDeadline {
  id: number;
  clientId: number;
  filingType: string;
  formNumber?: string;
  jurisdiction: string;
  dueDate: string;
  status: "not_started" | "in_progress" | "filed" | "paid" | "overdue";
  taxYear?: string;
  period?: string;
  priority: "low" | "medium" | "high" | "urgent";
  confirmationNumber?: string;
  client?: {
    id: number;
    company: string;
  };
}

export default function ComplianceCalendar() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [taxYear, setTaxYear] = useState<string>(new Date().getFullYear().toString());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all deadlines
  const { data: deadlinesData, isLoading } = useQuery<{ success: boolean; data: ComplianceDeadline[]; total: number }>({
    queryKey: ["/api/compliance/calendar", statusFilter, jurisdictionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (jurisdictionFilter !== "all") params.append("jurisdiction", jurisdictionFilter);

      const response = await fetch(`/api/compliance/calendar?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch deadlines");
      return response.json();
    },
  });

  const deadlines = deadlinesData?.data || [];

  // Fetch upcoming deadlines (next 30 days)
  const { data: upcomingData } = useQuery<{ success: boolean; data: any[]; total: number }>({
    queryKey: ["/api/compliance/upcoming/30"],
    queryFn: async () => {
      const response = await fetch("/api/compliance/upcoming/30", {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch upcoming deadlines");
      return response.json();
    },
  });

  const upcomingDeadlines = upcomingData?.data || [];

  // Fetch overdue deadlines
  const { data: overdueData } = useQuery<{ success: boolean; data: any[]; total: number }>({
    queryKey: ["/api/compliance/overdue"],
    queryFn: async () => {
      const response = await fetch("/api/compliance/overdue", {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch overdue deadlines");
      return response.json();
    },
  });

  const overdueDeadlines = overdueData?.data || [];

  // Fetch clients for generate dialog
  const { data: clients } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  // Generate deadlines mutation
  const generateMutation = useMutation({
    mutationFn: async ({ clientId, taxYear }: { clientId: string; taxYear: string }) => {
      const response = await fetch(`/api/compliance/generate/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxYear }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate deadlines");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Deadlines generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/upcoming/30"] });
      setIsCreateDialogOpen(false);
      setSelectedClientId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateDeadlines = () => {
    if (!selectedClientId || !taxYear) {
      toast({
        title: "Error",
        description: "Please select a client and tax year",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate({ clientId: selectedClientId, taxYear });
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, string> = {
      not_started: "bg-gray-500",
      in_progress: "bg-blue-500",
      filed: "bg-green-500",
      paid: "bg-green-600",
      overdue: "bg-red-500",
    };

    return (
      <Badge className={variants[status] || "bg-gray-500"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  // Priority badge component
  const PriorityBadge = ({ priority }: { priority: string }) => {
    const variants: Record<string, string> = {
      low: "bg-gray-400",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      urgent: "bg-red-600",
    };

    return (
      <Badge className={variants[priority] || "bg-gray-400"}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Days until deadline
  const daysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateString);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <AdminLayout title="Compliance Calendar">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Compliance Calendar">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-8 w-8" />
              Compliance Calendar
            </h1>
            <p className="text-gray-600 mt-1">
              Track tax deadlines and filing requirements across all clients
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate Deadlines
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Compliance Deadlines</DialogTitle>
                <DialogDescription>
                  Auto-generate tax deadlines for a client based on their entity type
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxYear">Tax Year</Label>
                  <Input
                    id="taxYear"
                    type="number"
                    value={taxYear}
                    onChange={(e) => setTaxYear(e.target.value)}
                    placeholder="2024"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateDeadlines} disabled={generateMutation.isPending}>
                  {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alert Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Overdue Filings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {overdueDeadlines.length}
              </div>
              <p className="text-xs text-red-600 mt-1">Requires immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Due Next 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {upcomingDeadlines.length}
              </div>
              <p className="text-xs text-yellow-600 mt-1">Plan ahead for these deadlines</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Filed This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {deadlines.filter((d) => d.status === "filed").length}
              </div>
              <p className="text-xs text-green-600 mt-1">Great job staying on track!</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by jurisdiction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jurisdictions</SelectItem>
                <SelectItem value="Federal">Federal</SelectItem>
                <SelectItem value="California">California</SelectItem>
                <SelectItem value="New York">New York</SelectItem>
                <SelectItem value="Texas">Texas</SelectItem>
                <SelectItem value="Florida">Florida</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Deadlines Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Deadlines ({deadlines.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Filing Type</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Until</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deadlines.map((deadline) => (
                    <TableRow key={deadline.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {deadline.client?.company || "N/A"}
                      </TableCell>
                      <TableCell>{deadline.filingType.replace("_", " ")}</TableCell>
                      <TableCell>{deadline.formNumber || "—"}</TableCell>
                      <TableCell>{deadline.jurisdiction}</TableCell>
                      <TableCell>{formatDate(deadline.dueDate)}</TableCell>
                      <TableCell>
                        {daysUntil(deadline.dueDate) >= 0 ? (
                          <span className="text-gray-700">
                            {daysUntil(deadline.dueDate)} days
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold">
                            {Math.abs(daysUntil(deadline.dueDate))} days overdue
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={deadline.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={deadline.priority} />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {deadlines.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No deadlines found. Try adjusting your filters or generate deadlines for a client.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
