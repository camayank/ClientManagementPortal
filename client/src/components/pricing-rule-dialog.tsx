import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CustomPricingRule, ServicePackage } from "@db/schema";

interface PricingRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRule?: CustomPricingRule;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {selectedRule ? "Edit Pricing Rule" : "New Pricing Rule"}
          </DialogTitle>
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
                defaultValue={selectedRule?.condition}
                required
                placeholder="e.g., quantity > 10"
              />
            </div>
            <div className="grid gap-2">
              <label>Adjustment</label>
              <Input
                name="adjustment"
                defaultValue={selectedRule?.adjustment}
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
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {selectedRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
