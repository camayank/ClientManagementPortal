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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Package2, Plus, Settings2, ArrowUpDown, ListChecks, Printer, Check, X } from "lucide-react";
import type {
  ServicePackage,
  ServiceFeature,
  ServiceFeatureTier,
  CustomPricingRule
} from "@db/schema";
import { FeatureTierDialog } from "@/components/feature-tier-dialog";
import { PricingRuleDialog } from "@/components/pricing-rule-dialog";

// Helper functions for package comparison
function getAllFeatures(packages: ServicePackage[] | undefined): string[] {
  if (!packages) return [];
  const featureSet = new Set<string>();
  packages.forEach(pkg => {
    if (Array.isArray(pkg.features)) {
      pkg.features.forEach(feature => featureSet.add(feature));
    }
  });
  return Array.from(featureSet).sort();
}

function isFeatureIncluded(pkg: ServicePackage, feature: string): boolean {
  return Array.isArray(pkg.features) && pkg.features.includes(feature);
}

interface PackageFormData extends Omit<ServicePackage, 'id' | 'createdAt' | 'updatedAt'> {
  features: string[];
}

export default function ServicePackages() {
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [isNewPackageDialogOpen, setIsNewPackageDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("packages");
  const [isFeatureTierDialogOpen, setIsFeatureTierDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ServiceFeatureTier | null>(null);
  const [isNewPricingRuleDialogOpen, setIsNewPricingRuleDialogOpen] = useState(false);
  const [selectedPricingRule, setSelectedPricingRule] = useState<CustomPricingRule | null>(null);
  const { toast } = useToast();


  const { data: packages, isLoading: packagesLoading } = useQuery<ServicePackage[]>({
    queryKey: ["/api/admin/service-packages"],
  });

  const { data: featureTiers, isLoading: tiersLoading } = useQuery<ServiceFeatureTier[]>({
    queryKey: ["/api/admin/service-feature-tiers"],
  });

  const { data: features, isLoading: featuresLoading } = useQuery<ServiceFeature[]>({
    queryKey: ["/api/admin/service-features"],
  });

  const { data: pricingRules, isLoading: rulesLoading } = useQuery<CustomPricingRule[]>({
    queryKey: ["/api/admin/pricing-rules"],
  });

  const createPackageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/service-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Service package created successfully",
      });
      setIsNewPackageDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await fetch(`/api/admin/service-packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Service package updated successfully",
      });
      setSelectedPackage(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const createFeatureTierMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/service-feature-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Feature tier created successfully",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (selectedPackage) {
      await updatePackageMutation.mutateAsync({
        id: selectedPackage.id,
        data: formData,
      });
    } else {
      await createPackageMutation.mutateAsync(formData);
    }
  };


  return (
    <AdminLayout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Service Packages</h1>
            <p className="text-muted-foreground">
              Manage service packages, features, and pricing rules
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsNewPackageDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Package
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="packages">
              <Package2 className="w-4 h-4 mr-2" />
              Packages
            </TabsTrigger>
            <TabsTrigger value="features">
              <ListChecks className="w-4 h-4 mr-2" />
              Features & Tiers
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <Settings2 className="w-4 h-4 mr-2" />
              Pricing Rules
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Package Comparison
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package2 className="h-5 w-5" />
                  Available Packages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {packagesLoading ? (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner"></span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Feature Tier</TableHead>
                        <TableHead>Billing Cycle</TableHead>
                        <TableHead>Base Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packages?.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium">{pkg.name}</TableCell>
                          <TableCell>{pkg.description}</TableCell>
                          <TableCell>
                            {featureTiers?.find(t => t.id === pkg.tierId)?.name || 'No Tier'}
                          </TableCell>
                          <TableCell>{pkg.billingCycle}</TableCell>
                          <TableCell>${pkg.basePrice}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                pkg.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {pkg.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              onClick={() => setSelectedPackage(pkg)}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Feature Tiers & Capabilities</CardTitle>
                <Button onClick={() => setIsFeatureTierDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Tier
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tiersLoading ? (
                    <div className="flex justify-center py-8">
                      <span className="loading loading-spinner"></span>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Features</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featureTiers?.map((tier) => (
                          <TableRow key={tier.id}>
                            <TableCell className="font-medium">{tier.name}</TableCell>
                            <TableCell>{tier.description}</TableCell>
                            <TableCell>{tier.level}</TableCell>
                            <TableCell>
                              {features
                                ?.filter((f) => f.tierId === tier.id)
                                .map((f) => f.name)
                                .join(", ")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedTier(tier);
                                  setIsFeatureTierDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>

            <FeatureTierDialog
              open={isFeatureTierDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setIsFeatureTierDialogOpen(false);
                  setSelectedTier(null);
                }
              }}
              selectedTier={selectedTier}
            />
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Custom Pricing Rules</CardTitle>
                <Button onClick={() => setIsNewPricingRuleDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Rule
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rulesLoading ? (
                    <div className="flex justify-center py-8">
                      <span className="loading loading-spinner"></span>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Package</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Adjustment</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pricingRules?.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell className="font-medium">{rule.name}</TableCell>
                            <TableCell>
                              {packages?.find(p => p.id === rule.packageId)?.name || 'Unknown Package'}
                            </TableCell>
                            <TableCell>{rule.condition}</TableCell>
                            <TableCell>{rule.adjustment}</TableCell>
                            <TableCell>{rule.priority}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  rule.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {rule.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedPricingRule(rule);
                                  setIsNewPricingRuleDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>

            <PricingRuleDialog
              open={isNewPricingRuleDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setIsNewPricingRuleDialogOpen(false);
                  setSelectedPricingRule(null);
                }
              }}
              selectedRule={selectedPricingRule}
              packages={packages}
            />
          </TabsContent>

          <TabsContent value="comparison">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Package Comparison Matrix</CardTitle>
                <Button onClick={() => window.print()} variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Comparison
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {packagesLoading ? (
                    <div className="flex justify-center py-8">
                      <span className="loading loading-spinner"></span>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Feature</TableHead>
                          {packages?.map((pkg) => (
                            <TableHead key={pkg.id} className="text-center">
                              {pkg.name}
                              <div className="text-sm text-muted-foreground">
                                ${pkg.basePrice}/{pkg.billingCycle}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getAllFeatures(packages).map((feature) => (
                          <TableRow key={feature}>
                            <TableCell className="font-medium">{feature}</TableCell>
                            {packages?.map((pkg) => (
                              <TableCell key={pkg.id} className="text-center">
                                {isFeatureIncluded(pkg, feature) ? (
                                  <Check className="mx-auto h-4 w-4 text-green-500" />
                                ) : (
                                  <X className="mx-auto h-4 w-4 text-red-500" />
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        <Dialog
          open={isNewPackageDialogOpen || selectedPackage !== null}
          onOpenChange={(open) => {
            if (!open) {
              setIsNewPackageDialogOpen(false);
              setSelectedPackage(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {selectedPackage ? "Edit Package" : "New Service Package"}
              </DialogTitle>
              <DialogDescription>
                {selectedPackage
                  ? "Update the service package details"
                  : "Create a new service package for clients"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <ScrollArea className="max-h-[60vh] px-1">
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label>Name</label>
                    <Input
                      name="name"
                      defaultValue={selectedPackage?.name}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label>Description</label>
                    <Textarea
                      name="description"
                      defaultValue={selectedPackage?.description || ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label>Feature Tier</label>
                    <Select
                      name="tierId"
                      defaultValue={selectedPackage?.tierId?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a feature tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {featureTiers?.map((tier) => (
                          <SelectItem key={tier.id} value={tier.id.toString()}>
                            {tier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label>Base Price</label>
                    <Input
                      name="basePrice"
                      type="number"
                      step="0.01"
                      defaultValue={selectedPackage?.basePrice || ""}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label>Billing Cycle</label>
                    <Select
                      name="billingCycle"
                      defaultValue={selectedPackage?.billingCycle || "monthly"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select billing cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label>Features (one per line)</label>
                    <Textarea
                      name="features"
                      defaultValue={
                        selectedPackage?.features
                          ? (selectedPackage.features as string[]).join("\n")
                          : ""
                      }
                      placeholder="Enter features, one per line"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label>Sort Order</label>
                    <Input
                      name="sortOrder"
                      type="number"
                      defaultValue={selectedPackage?.sortOrder || 0}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label>Upgrade Path</label>
                    <Select
                      name="upgradeToPackageId"
                      defaultValue={selectedPackage?.upgradeToPackageId?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select upgrade path" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages?.filter(p => p.id !== selectedPackage?.id).map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id.toString()}>
                            {pkg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="mt-6">
                <Button type="submit">
                  {selectedPackage ? "Update Package" : "Create Package"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}