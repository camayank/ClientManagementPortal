import { ClientLayout } from "@/components/layouts/ClientLayout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@db/schema";
import { useParams } from "wouter";
import { MessageCircle } from "lucide-react";

export default function ProjectDetails() {
  const { id } = useParams();
  
  const { data: project, isLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">Project Details and Documents</p>
          </div>
          <Button>
            <MessageCircle className="mr-2 h-4 w-4" />
            Chat With Us
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="professional">Professional Info</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="downloads">Downloads</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">User:</label>
                    <div>{project.clientId}</div>
                  </div>
                  
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Created on:</label>
                    <div>{new Date(project.createdAt || '').toLocaleDateString()}</div>
                  </div>
                  
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Last Date:</label>
                    <div>{new Date(project.lastDate).toLocaleDateString()}</div>
                  </div>
                  
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Project Assigned:</label>
                    <div>{project.assignedTo || 'Unassigned'}</div>
                  </div>
                  
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Project Status:</label>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="personal">
                <div>Personal Information Content</div>
              </TabsContent>

              <TabsContent value="professional">
                <div>Professional Information Content</div>
              </TabsContent>

              <TabsContent value="documents">
                <div>Documents Content</div>
              </TabsContent>

              <TabsContent value="downloads">
                <div>Downloads Content</div>
              </TabsContent>

              <TabsContent value="chat">
                <div>Chat Content</div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
