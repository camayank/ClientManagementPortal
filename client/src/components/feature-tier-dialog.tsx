import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ServiceFeatureTier } from "@db/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface FeatureTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTier?: ServiceFeatureTier | null;
}

export function FeatureTierDialog({
  open,
  onOpenChange,
  selectedTier
}: FeatureTierDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/service-feature-tiers/${id}`, {
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
        description: "Feature tier deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-feature-tiers"] });
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

    if (selectedTier) {
      await updateMutation.mutateAsync({
        id: selectedTier.id,
        data: formData,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = async () => {
    if (selectedTier) {
      await deleteMutation.mutateAsync(selectedTier.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {selectedTier ? "Edit Feature Tier" : "New Feature Tier"}
            </DialogTitle>
            {selectedTier && (
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
                      feature tier and remove it from all associated packages.
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
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}>
              {selectedTier ? "Update Tier" : "Create Tier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}