import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

// Admin imports
import AdminDashboard from "@/pages/admin/dashboard";
import ClientOnboarding from "@/pages/admin/client-onboarding";
import AdminClients from "@/pages/admin/clients";
import AdminCredentials from "@/pages/admin/credentials";
import AdminDocuments from "@/pages/admin/documents";
import AdminEscalations from "@/pages/admin/escalations";
import AdminProjects from "@/pages/admin/projects";
import QualityControl from "@/pages/admin/quality-control";
import AdminReports from "@/pages/admin/reports";
import ServicePackages from "@/pages/admin/service-packages";
import SLAManagement from "@/pages/admin/sla-management";
import UserRoles from "@/pages/admin/user-roles";
import WorkAllocation from "@/pages/admin/work-allocation";

// Client imports
import ClientDashboard from "@/pages/client/dashboard";
import ClientDocuments from "@/pages/client/documents";
import ClientProjects from "@/pages/client/projects";
import PersonalInfo from "@/pages/client/personal-info";
import QualityReviews from "@/pages/client/quality-reviews";
import ClientSLA from "@/pages/client/sla";
import Support from "@/pages/client/support";
import Communication from "@/pages/client/communication";

function ProtectedRoute({ 
  component: Component, 
  requireAdmin 
}: { 
  component: React.ComponentType, 
  requireAdmin?: boolean 
}) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || (requireAdmin && user.role !== 'admin') || (!requireAdmin && user.role !== 'client')) {
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
      {/* Root path redirects based on role */}
      <Route path="/">
        {user.role === "admin" ? 
          <Redirect to="/admin/dashboard" /> : 
          <Redirect to="/client/dashboard" />
        }
      </Route>

      {/* Client routes */}
      <Route path="/client/dashboard">
        <ProtectedRoute component={ClientDashboard} requireAdmin={false} />
      </Route>
      <Route path="/client/documents">
        <ProtectedRoute component={ClientDocuments} requireAdmin={false} />
      </Route>
      <Route path="/client/projects">
        <ProtectedRoute component={ClientProjects} requireAdmin={false} />
      </Route>
      <Route path="/client/personal-info">
        <ProtectedRoute component={PersonalInfo} requireAdmin={false} />
      </Route>
      <Route path="/client/quality-reviews">
        <ProtectedRoute component={QualityReviews} requireAdmin={false} />
      </Route>
      <Route path="/client/sla">
        <ProtectedRoute component={ClientSLA} requireAdmin={false} />
      </Route>
      <Route path="/client/support">
        <ProtectedRoute component={Support} requireAdmin={false} />
      </Route>
      <Route path="/client/communication">
        <ProtectedRoute component={Communication} requireAdmin={false} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute component={AdminDashboard} requireAdmin={true} />
      </Route>
      <Route path="/admin/client-onboarding">
        <ProtectedRoute component={ClientOnboarding} requireAdmin={true} />
      </Route>
      <Route path="/admin/clients">
        <ProtectedRoute component={AdminClients} requireAdmin={true} />
      </Route>
      <Route path="/admin/credentials">
        <ProtectedRoute component={AdminCredentials} requireAdmin={true} />
      </Route>
      <Route path="/admin/documents">
        <ProtectedRoute component={AdminDocuments} requireAdmin={true} />
      </Route>
      <Route path="/admin/escalations">
        <ProtectedRoute component={AdminEscalations} requireAdmin={true} />
      </Route>
      <Route path="/admin/projects">
        <ProtectedRoute component={AdminProjects} requireAdmin={true} />
      </Route>
      <Route path="/admin/quality-control">
        <ProtectedRoute component={QualityControl} requireAdmin={true} />
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute component={AdminReports} requireAdmin={true} />
      </Route>
      <Route path="/admin/service-packages">
        <ProtectedRoute component={ServicePackages} requireAdmin={true} />
      </Route>
      <Route path="/admin/sla-management">
        <ProtectedRoute component={SLAManagement} requireAdmin={true} />
      </Route>
      <Route path="/admin/user-roles">
        <ProtectedRoute component={UserRoles} requireAdmin={true} />
      </Route>
      <Route path="/admin/work-allocation">
        <ProtectedRoute component={WorkAllocation} requireAdmin={true} />
      </Route>

      {/* Fallback to 404 */}
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