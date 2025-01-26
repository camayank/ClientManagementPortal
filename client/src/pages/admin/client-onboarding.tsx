import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Paperclip,
  MessageSquare,
  Package,
} from "lucide-react";
import type { ClientOnboarding } from "@db/schema";

const ONBOARDING_STEPS = [
  "initial_contact",
  "needs_assessment",
  "proposal_sent",
  "contract_review",
  "document_collection",
  "service_setup",
  "training_scheduled",
  "completed",
] as const;

const STEP_LABELS: Record<typeof ONBOARDING_STEPS[number], string> = {
  initial_contact: "Initial Contact",
  needs_assessment: "Needs Assessment",
  proposal_sent: "Proposal Sent",
  contract_review: "Contract Review",
  document_collection: "Document Collection",
  service_setup: "Service Setup",
  training_scheduled: "Training Scheduled",
  completed: "Completed",
};

const STEP_REQUIREMENTS: Record<typeof ONBOARDING_STEPS[number], string[]> = {
  initial_contact: [
    "Schedule initial meeting",
    "Gather basic business information",
    "Identify key stakeholders",
  ],
  needs_assessment: [
    "Complete business requirements form",
    "Review current processes",
    "Document pain points",
    "Identify service package fit",
  ],
  proposal_sent: [
    "Prepare custom service proposal",
    "Include pricing details",
    "Define service scope",
    "Set timeline expectations",
  ],
  contract_review: [
    "Send service agreement",
    "Review terms and conditions",
    "Address client questions",
    "Collect signatures",
  ],
  document_collection: [
    "Request required documents",
    "Verify document completeness",
    "Set up secure document storage",
    "Create document checklist",
  ],
  service_setup: [
    "Configure service package",
    "Set up client portal access",
    "Initialize client workspace",
    "Configure notifications",
  ],
  training_scheduled: [
    "Schedule training session",
    "Prepare training materials",
    "Send calendar invites",
    "Confirm attendance",
  ],
  completed: [
    "Final review of setup",
    "Welcome email sent",
    "Schedule follow-up",
    "Activate services",
  ],
};

export default function ClientOnboarding() {
  const [selectedClient, setSelectedClient] = useState<ClientOnboarding | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);
  const { toast } = useToast();

  const { data: onboardingClients, isLoading } = useQuery<ClientOnboarding[]>({
    queryKey: ["/api/admin/client-onboarding"],
  });

  const updateOnboardingStatus = async (clientId: number, newStep: string, notes?: string) => {
    try {
      const response = await fetch(`/api/admin/client-onboarding/${clientId}/step`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: newStep, notes }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Onboarding status updated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getStepBadge = (step: string) => {
    switch (step) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Completed
          </Badge>
        );
      case "initial_contact":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="w-4 h-4 mr-1" />
            New
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-4 h-4 mr-1" />
            In Progress
          </Badge>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Client Onboarding</h1>
            <p className="text-muted-foreground">
              Manage and track client onboarding progress
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Active Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner"></span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Current Step</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Communication</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onboardingClients?.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.client?.company}
                      </TableCell>
                      <TableCell>
                        {getStepBadge(client.currentStep)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Paperclip className="w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <MessageSquare className="w-4 h-4" />
                          History
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Package className="w-4 h-4" />
                          Assign
                        </Button>
                      </TableCell>
                      <TableCell>
                        {new Date(client.startedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {client.assignedUser?.username || "Unassigned"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowRequirements(true);
                          }}
                        >
                          Requirements
                        </Button>
                        <Select
                          value={client.currentStep}
                          onValueChange={(value) =>
                            updateOnboardingStatus(client.id, value)
                          }
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select step" />
                          </SelectTrigger>
                          <SelectContent>
                            {ONBOARDING_STEPS.map((step) => (
                              <SelectItem key={step} value={step}>
                                {STEP_LABELS[step]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showRequirements}
        onOpenChange={() => {
          setShowRequirements(false);
          setSelectedClient(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Step Requirements</DialogTitle>
            <DialogDescription>
              Complete these requirements before moving to the next step
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedClient && (
              <>
                <h3 className="text-lg font-semibold">
                  {STEP_LABELS[selectedClient.currentStep]}
                </h3>
                <div className="space-y-2">
                  {STEP_REQUIREMENTS[selectedClient.currentStep].map((req, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded-lg"
                    >
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4"
                      />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Additional Notes
                  </label>
                  <Textarea
                    placeholder="Add notes about the current status..."
                    defaultValue={selectedClient?.notes || ""}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() =>
                selectedClient &&
                updateOnboardingStatus(
                  selectedClient.id,
                  selectedClient.currentStep,
                  selectedClient.notes
                )
              }
            >
              Update Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}