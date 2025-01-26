import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ServiceFeatureTier } from "@db/schema";

interface FeatureTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTier?: ServiceFeatureTier;
}

export function FeatureTierDialog({
  open,
  onOpenChange,
  selectedTier
}: FeatureTierDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-feature-tiers"] });
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
      const response = await fetch(`/api/admin/service-feature-tiers/${id}`, {
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
        description: "Feature tier updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-feature-tiers"] });
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

    if (selectedTier) {
      await updateMutation.mutateAsync({
        id: selectedTier.id,
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
            {selectedTier ? "Edit Feature Tier" : "New Feature Tier"}
          </DialogTitle>
          <DialogDescription>
            {selectedTier
              ? "Update the feature tier details"
              : "Create a new feature tier for service packages"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label>Name</label>
              <Input
                name="name"
                defaultValue={selectedTier?.name}
                required
              />
            </div>
            <div className="grid gap-2">
              <label>Description</label>
              <Textarea
                name="description"
                defaultValue={selectedTier?.description || ""}
              />
            </div>
            <div className="grid gap-2">
              <label>Level</label>
              <Input
                name="level"
                type="number"
                defaultValue={selectedTier?.level || 0}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">
              {selectedTier ? "Update Tier" : "Create Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
