import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";

const roleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().min(1, "Description is required"),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: { id: number; name: string; description: string; permissions: {id: string}[] } | null;
}

const AVAILABLE_PERMISSIONS = [
  { id: "users:manage", label: "Manage Users" },
  { id: "clients:manage", label: "Manage Clients" },
  { id: "projects:manage", label: "Manage Projects" },
  { id: "documents:manage", label: "Manage Documents" },
  { id: "reports:manage", label: "Manage Reports" },
  { id: "strategic_planning:manage", label: "Strategic Planning" },
  { id: "team_performance:manage", label: "Team Performance" },
  { id: "quality_findings:manage", label: "Quality Findings" },
  { id: "compliance:manage", label: "Compliance Management" },
  { id: "regulatory_updates:manage", label: "Regulatory Updates" },
  { id: "deadlines:manage", label: "Deadline Management" },
];

export default function RoleDialog({ open, onOpenChange, role }: RoleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.permissions?.map((p: any) => p.id) || []
  );

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const response = await fetch(role ? `/api/admin/roles/${role.id}` : '/api/admin/roles', {
        method: role ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          permissions: selectedPermissions,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: `Role ${role ? 'updated' : 'created'} successfully`,
      });
      reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoleFormData) => {
    mutation.mutate({...data, permissions: selectedPermissions})
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                className="mt-1.5"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                className="mt-1.5"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-4 mt-2 border rounded-lg p-4">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <div key={permission.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission.id}
                      checked={selectedPermissions.includes(permission.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPermissions([...selectedPermissions, permission.id]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter((p) => p !== permission.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={permission.id}
                      className="text-sm text-muted-foreground"
                    >
                      {permission.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create Role"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}