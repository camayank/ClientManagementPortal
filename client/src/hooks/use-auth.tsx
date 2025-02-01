import { useState, useEffect, createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  role: string;
  email?: string;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  checkPermission: (resource: string, action: "read" | "write" | "delete") => boolean;
}

interface AuthResponse {
  user: User;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_CHECK_INTERVAL = 1000 * 60 * 5; // Check session every 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: authData, refetch } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Not authenticated");
        }
        throw new Error("Failed to fetch user data");
      }
      return response.json();
    },
    retry: false,
    enabled: false,
  });

  // Session check interval
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await refetch();
      } catch (error) {
        if (error instanceof Error && error.message === "Not authenticated") {
          toast({
            variant: "destructive",
            title: "Session Expired",
            description: "Please log in again to continue.",
          });
          await logout();
        }
      }
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [refetch]);

  // Initial auth check
  useEffect(() => {
    refetch().finally(() => setIsLoading(false));
  }, [refetch]);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      await refetch();
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    } catch (error) {
      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message,
        });
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Logout failed");
      }

      queryClient.clear();
      await refetch();
      toast({
        title: "Logged out",
        description: "You have been safely logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "An error occurred while logging out.",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Password reset failed");
      }

      const data = await response.json();
      toast({
        title: "Password Reset Requested",
        description: data.message || "If an account exists with this email, you will receive reset instructions.",
      });
    } catch (error) {
      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Reset Failed",
          description: error.message,
        });
      }
      throw error;
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Password update failed");
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
    } catch (error) {
      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message,
        });
      }
      throw error;
    }
  };

  const checkPermission = (resource: string, action: "read" | "write" | "delete"): boolean => {
    if (!authData?.user) return false;
    if (authData.user.role === "admin") return true;

    // Client permissions check
    const allowedActions: Record<string, ("read" | "write" | "delete")[]> = {
      projects: ["read", "write"],
      documents: ["read", "write"],
      tasks: ["read"],
      messages: ["read", "write"],
    };

    // Check both role-based permissions and specific user permissions
    const hasRolePermission = allowedActions[resource]?.includes(action) ?? false;
    const hasSpecificPermission = authData.user.roles?.includes(`${resource}:${action}`);

    return hasRolePermission || !!hasSpecificPermission;
  };

  return (
    <AuthContext.Provider
      value={{
        user: authData?.user || null,
        isLoading,
        isAdmin: authData?.user?.role === "admin",
        login,
        logout,
        resetPassword,
        updatePassword,
        checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}