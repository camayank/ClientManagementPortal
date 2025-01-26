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
import { Package2, Plus } from "lucide-react";
import type { ServicePackage } from "@db/schema";

export default function ServicePackages() {
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [isNewPackageDialogOpen, setIsNewPackageDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: packages, isLoading } = useQuery<ServicePackage[]>({
    queryKey: ["/api/admin/service-packages"],
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
              Manage available service packages for clients
            </p>
          </div>
          <Button onClick={() => setIsNewPackageDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Package
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              Available Packages
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
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
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
      </div>

      <Dialog
        open={isNewPackageDialogOpen || selectedPackage !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsNewPackageDialogOpen(false);
            setSelectedPackage(null);
          }
        }}
      >
        <DialogContent>
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
            </div>
            <DialogFooter>
              <Button type="submit">
                {selectedPackage ? "Update Package" : "Create Package"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
