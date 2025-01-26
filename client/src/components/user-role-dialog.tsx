import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Role } from "@db/schema";
import { useState, useEffect } from "react";

interface UserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export default function UserRoleDialog({ open, onOpenChange, user }: UserRoleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  // Fetch all available roles
  const { data: roles } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles'],
    enabled: open,
  });

  // Set initial selected roles when dialog opens
  useEffect(() => {
    if (user && open) {
      setSelectedRoles((user as any).roles?.map((r: Role) => r.id) || []);
    }
  }, [user, open]);

  const mutation = useMutation({
    mutationFn: async (data: { userId: number; roleIds: number[] }) => {
      const response = await fetch(`/api/admin/users/${data.userId}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: data.roleIds }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/roles'] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "User roles updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!user) return;
    mutation.mutate({
      userId: user.id,
      roleIds: selectedRoles,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage User Roles: {user?.username}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            {roles?.map((role) => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={selectedRoles.includes(role.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRoles([...selectedRoles, role.id]);
                    } else {
                      setSelectedRoles(selectedRoles.filter((id) => id !== role.id));
                    }
                  }}
                />
                <label
                  htmlFor={`role-${role.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {role.name}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
