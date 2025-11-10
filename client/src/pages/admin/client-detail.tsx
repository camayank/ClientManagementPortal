import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import type { Client } from "@db/schema";
import { AccountingProfileForm } from "@/components/accounting/AccountingProfileForm";

export default function ClientDetail() {
  const [, params] = useRoute("/admin/clients/:id");
  const clientId = params?.id ? parseInt(params.id) : null;

  // Fetch client details
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const client = clients?.find((c) => c.id === clientId);

  if (isLoading) {
    return (
      <AdminLayout title="Client Details">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (!client) {
    return (
      <AdminLayout title="Client Not Found">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">Client not found</p>
            <Link href="/admin/clients">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={client.company || "Client Details"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link href="/admin/clients">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">{client.company}</h1>
                <p className="text-gray-600">{client.industry || "No industry specified"}</p>
              </div>
            </div>
          </div>
          <Badge variant={client.status === "active" ? "default" : "secondary"}>
            {client.status}
          </Badge>
        </div>

        {/* Client Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{client.contactEmail || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{client.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{client.address || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Client Since</p>
                <p className="font-medium">
                  {client.createdAt
                    ? new Date(client.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="accounting" className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounting">Accounting Profile</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="accounting">
            <AccountingProfileForm clientId={clientId!} />
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>View and manage projects for this client</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Projects list coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Client documents and files</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Documents list coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Deadlines</CardTitle>
                <CardDescription>Tax and regulatory filing deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Compliance deadlines list coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
