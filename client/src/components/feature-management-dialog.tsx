import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ServiceFeature, ServiceFeatureTier } from "@db/schema";

interface FeatureManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFeature: ServiceFeature | null;
  tiers?: ServiceFeatureTier[];
}

export function FeatureManagementDialog({
  open,
  onOpenChange,
  selectedFeature,
  tiers,
}: FeatureManagementDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/service-features", {
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
        description: "Service feature created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-features"] });
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
      const response = await fetch(`/api/admin/service-features/${id}`, {
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
        description: "Service feature updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-features"] });
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

    if (selectedFeature) {
      await updateMutation.mutateAsync({
        id: selectedFeature.id,
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
            {selectedFeature ? "Edit Feature" : "New Feature"}
          </DialogTitle>
          <DialogDescription>
            {selectedFeature
              ? "Update the service feature details"
              : "Create a new service feature"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label>Name</label>
              <Input
                name="name"
                defaultValue={selectedFeature?.name}
                required
              />
            </div>
            <div className="grid gap-2">
              <label>Description</label>
              <Textarea
                name="description"
                defaultValue={selectedFeature?.description || ""}
              />
            </div>
            <div className="grid gap-2">
              <label>Feature Type</label>
              <Select
                name="type"
                defaultValue={selectedFeature?.type || "boolean"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select feature type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                  <SelectItem value="numeric">Numeric</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label>Unit (for numeric features)</label>
              <Input
                name="unit"
                defaultValue={selectedFeature?.unit || ""}
                placeholder="e.g., GB, Users, etc."
              />
            </div>
            <div className="grid gap-2">
              <label>Assign to Tier</label>
              <Select
                name="tierId"
                defaultValue={selectedFeature?.tierId?.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers?.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id.toString()}>
                      {tier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {selectedFeature ? "Update Feature" : "Create Feature"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
