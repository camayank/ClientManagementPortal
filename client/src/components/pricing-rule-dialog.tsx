import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomPricingRule, ServicePackage } from "@db/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface PricingRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRule?: CustomPricingRule | null;
  packages?: ServicePackage[];
}

export function PricingRuleDialog({
  open,
  onOpenChange,
  selectedRule,
  packages
}: PricingRuleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/pricing-rules", {
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
        description: "Pricing rule created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-rules"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await fetch(`/api/admin/pricing-rules/${id}`, {
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
        description: "Pricing rule updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-rules"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/pricing-rules/${id}`, {
        method: "DELETE",
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
        description: "Pricing rule deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-rules"] });
      onOpenChange(false);
      setShowDeleteDialog(false);
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

    if (selectedRule) {
      await updateMutation.mutateAsync({
        id: selectedRule.id,
        data: formData,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = async () => {
    if (selectedRule) {
      await deleteMutation.mutateAsync(selectedRule.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {selectedRule ? "Edit Pricing Rule" : "New Pricing Rule"}
            </DialogTitle>
            {selectedRule && (
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the
                      pricing rule from the system.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <DialogDescription>
            {selectedRule
              ? "Update the pricing rule details"
              : "Create a new pricing rule for service packages"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label>Package</label>
              <Select
                name="packageId"
                defaultValue={selectedRule?.packageId?.toString()}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label>Rule Name</label>
              <Input
                name="name"
                defaultValue={selectedRule?.name}
                required
              />
            </div>
            <div className="grid gap-2">
              <label>Description</label>
              <Textarea
                name="description"
                defaultValue={selectedRule?.description || ""}
              />
            </div>
            <div className="grid gap-2">
              <label>Condition</label>
              <Input
                name="condition"
                defaultValue={selectedRule?.condition?.toString()}
                required
                placeholder="e.g., quantity > 10"
              />
            </div>
            <div className="grid gap-2">
              <label>Adjustment</label>
              <Input
                name="adjustment"
                defaultValue={selectedRule?.adjustment?.toString()}
                required
                placeholder="e.g., -10% or +50"
              />
            </div>
            <div className="grid gap-2">
              <label>Priority</label>
              <Input
                name="priority"
                type="number"
                defaultValue={selectedRule?.priority || 0}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}>
              {selectedRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}