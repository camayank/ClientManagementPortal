import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import type { AnalyticsMetric, DashboardConfig } from "@db/schema";

export default function AnalyticsDashboard() {
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [dateRange, setDateRange] = useState<"day" | "week" | "month">("week");

  const { data: metrics, isLoading: loadingMetrics } = useQuery<AnalyticsMetric[]>({
    queryKey: ["/api/analytics/metrics"],
  });

  const { data: dataPoints, isLoading: loadingData } = useQuery({
    queryKey: ["/api/analytics/data-points", selectedMetric],
    enabled: !!selectedMetric,
  });

  const { data: dashboards } = useQuery<DashboardConfig[]>({
    queryKey: ["/api/analytics/dashboards"],
  });

  if (loadingMetrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(value: "day" | "week" | "month") => setDateRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics?.map((metric) => (
          <Card key={metric.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>{metric.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataPoints?.filter(dp => dp.metricId === metric.id) ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
