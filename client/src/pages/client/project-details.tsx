import { ClientLayout } from "@/components/layouts/ClientLayout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@db/schema";
import { useParams } from "wouter";
import { MessageCircle, Plus } from "lucide-react";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MilestoneCreate } from "@/components/milestones/MilestoneCreate";
import { MilestoneList } from "@/components/milestones/MilestoneList";

export default function ProjectDetails() {
  const params = useParams<{ id: string }>();
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${params.id}`],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="loading">Loading...</span>
      </div>
    );
  }

  if (!project || !params.id) {
    return <div>Project not found</div>;
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">Project Details and Progress</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreatingMilestone(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
            <Button>
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat With Us
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Status:</label>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
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
                    <label className="text-sm font-medium">Project Manager:</label>
                    <div>{project.assignedTo || 'Unassigned'}</div>
                  </div>

                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Description:</label>
                    <div className="text-sm text-muted-foreground">
                      {project.description || 'No description provided'}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="milestones">
                <div className="space-y-4">
                  <MilestoneList projectId={parseInt(params.id)} />
                </div>
              </TabsContent>

              <TabsContent value="documents">
                <div className="space-y-6">
                  <DocumentUpload projectId={parseInt(params.id)} />
                  <DocumentList />
                </div>
              </TabsContent>

              <TabsContent value="chat">
                <div className="p-4 text-center text-muted-foreground">
                  Chat feature coming soon...
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreatingMilestone} onOpenChange={setIsCreatingMilestone}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Milestone</DialogTitle>
          </DialogHeader>
          <MilestoneCreate 
            projectId={parseInt(params.id)} 
            onClose={() => setIsCreatingMilestone(false)} 
          />
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}