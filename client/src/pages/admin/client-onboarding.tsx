import { useState } from "react";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
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
  DialogTrigger,
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
  Upload,
  FileText,
  Plus,
  Loader2,
} from "lucide-react";
import type { ClientOnboarding, ClientOnboardingDocument } from "@db/schema";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Package as PackageIcon } from "lucide-react";
import type { ServicePackage } from "@db/schema";

const ONBOARDING_STEPS = [
  "initial_contact",
  "needs_assessment",
  "proposal_sent",
  "package_selection",
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
  package_selection: "Package Selection",
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
  package_selection: [
    "Review available service packages",
    "Select appropriate package tier",
    "Discuss customization needs",
    "Confirm billing frequency",
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

const REQUIRED_DOCUMENTS = [
  "Business Registration",
  "Tax ID Documentation",
  "Financial Statements",
  "Bank Statements",
  "Service Agreement",
  "Client Information Form",
];

const newClientSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
});

type NewClientFormData = z.infer<typeof newClientSchema>;

export default function ClientOnboarding() {
  const [selectedClient, setSelectedClient] = useState<ClientOnboarding | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const { toast } = useToast();
  const queryClient = new QueryClient();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  const form = useForm<NewClientFormData>({
    resolver: zodResolver(newClientSchema),
    defaultValues: {
      company: "",
      email: "",
      contactPerson: "",
      phone: "",
    },
  });

  const { data: onboardingClients, isLoading, refetch } = useQuery<ClientOnboarding[]>({
    queryKey: ["/api/admin/client-onboarding"],
  });

  const { data: documents } = useQuery<ClientOnboardingDocument[]>({
    queryKey: ["/api/admin/client-onboarding/documents", selectedClient?.id],
    enabled: !!selectedClient,
  });

  const { data: servicePackages } = useQuery<ServicePackage[]>({
    queryKey: ["/api/admin/service-packages"],
    enabled: showNewClient || selectedClient?.currentStep === "package_selection",
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
      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const uploadDocument = async (clientId: number, file: File, documentType: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);

    try {
      const response = await fetch(`/api/admin/client-onboarding/${clientId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const onSubmit = async (data: NewClientFormData) => {
    try {
      const response = await fetch("/api/admin/client-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          packageId: selectedPackage,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const newClient = await response.json();

      queryClient.setQueryData<ClientOnboarding[]>(
        ["/api/admin/client-onboarding"],
        (old) => [...(old || []), newClient]
      );

      toast({
        title: "Success",
        description: "New client onboarding started successfully",
      });

      form.reset();
      setShowNewClient(false);
      setSelectedPackage(null);

      await queryClient.invalidateQueries({ queryKey: ["/api/admin/client-onboarding"] });
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

  const calculateProgress = (client: ClientOnboarding) => {
    const stepIndex = ONBOARDING_STEPS.indexOf(client.currentStep);
    return ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100;
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
          <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <DialogHeader>
                    <DialogTitle>Add New Client</DialogTitle>
                    <DialogDescription>
                      Start the onboarding process for a new client
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="company@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="Phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-4">
                      <h4 className="font-medium">Select Service Package</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {servicePackages?.map((pkg) => (
                          <div
                            key={pkg.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedPackage === pkg.id
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedPackage(pkg.id)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <PackageIcon className="h-4 w-4" />
                              <h3 className="font-medium">{pkg.name}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {pkg.description}
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">
                                ${pkg.basePrice}/
                                {pkg.billingCycle}
                              </span>
                              {selectedPackage === pkg.id && (
                                <span className="text-primary">Selected</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setShowNewClient(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={form.formState.isSubmitting || !selectedPackage}>
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Start Onboarding"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {onboardingClients?.length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  New This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {onboardingClients?.filter((c) =>
                    new Date(c.startedAt).getMonth() === new Date().getMonth()
                  ).length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {onboardingClients?.filter((c) =>
                    c.currentStep === "completed" &&
                    new Date(c.completedAt).getMonth() === new Date().getMonth()
                  ).length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Completion Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  14 days
                </div>
              </CardContent>
            </Card>
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
                      <TableHead>Progress</TableHead>
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
                          <div className="flex items-center gap-2">
                            <Progress
                              value={calculateProgress(client)}
                              className="w-[60px]"
                            />
                            <span className="text-sm text-muted-foreground">
                              {Math.round(calculateProgress(client))}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStepBadge(client.currentStep)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowDocuments(true);
                            }}
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
                          {client.startedAt
                            ? new Date(client.startedAt).toLocaleDateString()
                            : "N/A"}
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

          <Card>
            <CardHeader>
              <CardTitle>Onboarding Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4">
                {ONBOARDING_STEPS.map((step, index) => (
                  <div key={step} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-medium">{STEP_LABELS[step]}</h4>
                      <p className="text-sm text-muted-foreground">
                        {STEP_REQUIREMENTS[step][0]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showRequirements} onOpenChange={setShowRequirements}>
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

        <Dialog open={showDocuments} onOpenChange={setShowDocuments}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Client Documents</DialogTitle>
              <DialogDescription>
                Manage required documents for client onboarding
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {REQUIRED_DOCUMENTS.map((docType) => {
                const doc = documents?.find((d) => d.documentType === docType);
                return (
                  <div
                    key={docType}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">{docType}</h4>
                      <p className="text-sm text-muted-foreground">
                        {doc ? "Uploaded" : "Pending"}
                      </p>
                    </div>
                    <div>
                      {doc ? (
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      ) : (
                        <label>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && selectedClient) {
                                uploadDocument(selectedClient.id, file, docType);
                              }
                            }}
                          />
                          <Button variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}