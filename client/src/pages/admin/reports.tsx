import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useState } from "react";

export default function AdminReports() {
  const [reportType, setReportType] = useState<string>("documents");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/admin/reports', reportType, startDate?.toISOString(), endDate?.toISOString()],
    enabled: !!startDate && !!endDate,
  });

  const downloadReport = async () => {
    try {
      const response = await fetch(`/api/admin/reports/${reportType}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Generate and view detailed reports</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Report Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documents">Document Activity</SelectItem>
                    <SelectItem value="users">User Activity</SelectItem>
                    <SelectItem value="projects">Project Status</SelectItem>
                    <SelectItem value="clients">Client Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <DatePicker date={startDate} setDate={setStartDate} />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={downloadReport}
                  disabled={!startDate || !endDate}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <span className="loading">Loading...</span>
          </div>
        ) : reportData ? (
          <div className="grid gap-4 md:grid-cols-2">
            {reportType === "documents" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Document Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Total Documents</dt>
                        <dd className="text-2xl font-bold">{reportData.totalDocuments}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Total Size</dt>
                        <dd className="text-2xl font-bold">{reportData.totalSize}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Document Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      {reportData.documentTypes?.map((type: any) => (
                        <div key={type.name} className="flex justify-between">
                          <dt className="text-sm font-medium">{type.name}</dt>
                          <dd className="text-sm text-gray-500">{type.count}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              </>
            )}

            {reportType === "users" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>User Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Active Users</dt>
                        <dd className="text-2xl font-bold">{reportData.activeUsers}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">New Users</dt>
                        <dd className="text-2xl font-bold">{reportData.newUsers}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Login Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      {reportData.loginActivity?.map((day: any) => (
                        <div key={day.date} className="flex justify-between">
                          <dt className="text-sm font-medium">{day.date}</dt>
                          <dd className="text-sm text-gray-500">{day.count} logins</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
