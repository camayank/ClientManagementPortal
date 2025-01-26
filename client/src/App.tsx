import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

function ProtectedRoute({ 
  component: Component, 
  isAdmin: requireAdmin 
}: { 
  component: React.ComponentType, 
  isAdmin: boolean 
}) {
  const { user, isAdmin } = useUser();

  if (!user || (requireAdmin && !isAdmin) || (!requireAdmin && isAdmin)) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Show auth page when not logged in
  if (!user) {
    return <AuthPage />;
  }

  return (
    <Switch>
      {/* Add root redirect */}
      <Route path="/">
        <Redirect to={user.role === "admin" ? "/admin" : "/client"} />
      </Route>

      {/* Add NotFound route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;