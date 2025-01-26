import { ClientLayout } from "@/components/layouts/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, AlertTriangle, Activity } from "lucide-react";

export default function ClientSLA() {
  return (
    <ClientLayout>
      <div className="space-y-6 p-6 pb-16">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">SLA Tracking</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor your service level agreements and performance metrics.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Overall SLA</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.2%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Current month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.8h</div>
              <p className="text-xs text-muted-foreground mt-1">
                Average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Met Targets</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-muted-foreground mt-1">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Attention Needed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground mt-1">
                Review required
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Future implementation: Detailed SLA metrics and history */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Service Level Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              SLA tracking features will be implemented here, including:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Performance metrics</li>
              <li>Historical data</li>
              <li>Service level reports</li>
              <li>Compliance tracking</li>
              <li>Improvement trends</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
