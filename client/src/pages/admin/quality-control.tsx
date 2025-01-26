import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, AlertTriangle, TrendingUp, FileCheck } from "lucide-react";

export default function QualityControl() {
  return (
    <AdminLayout>
      <div className="space-y-6 p-6 pb-16">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Quality Control</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor and maintain quality standards across all deliverables.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92%</div>
              <p className="text-xs text-muted-foreground mt-1">
                +2% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Items Reviewed</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">145</div>
              <p className="text-xs text-muted-foreground mt-1">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Passed QC</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">132</div>
              <p className="text-xs text-muted-foreground mt-1">
                91% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">13</div>
              <p className="text-xs text-muted-foreground mt-1">
                All resolved
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Future implementation: Quality control checkpoints and review system */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quality Control System</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Quality control features will be implemented here, including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Quality checkpoints and criteria</li>
              <li>Review workflows</li>
              <li>Approval processes</li>
              <li>Quality metrics tracking</li>
              <li>Issue resolution tracking</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
