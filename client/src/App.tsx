import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/hooks/use-error-boundary";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

// Admin imports
import AdminDashboard from "@/pages/admin/dashboard";
import AdminClients from "@/pages/admin/clients";
import AdminDocuments from "@/pages/admin/documents";
import AdminCredentials from "@/pages/admin/credentials";
import AdminReports from "@/pages/admin/reports";
import UserRoleManagement from "@/pages/admin/user-roles";
import ClientOnboarding from "@/pages/admin/client-onboarding";
import ServicePackages from "@/pages/admin/service-packages";
import WorkAllocation from "@/pages/admin/work-allocation";
import QualityControl from "@/pages/admin/quality-control";
import SLAManagement from "@/pages/admin/sla-management";
import Escalations from "@/pages/admin/escalations";
import ComplianceCalendar from "@/pages/admin/compliance-calendar";

// Client imports
import ClientDashboard from "@/pages/client/dashboard";
import PersonalInfo from "@/pages/client/personal-info";
import ClientProjects from "@/pages/client/projects";
import ProjectDetails from "@/pages/client/project-details";
import ClientDocuments from "@/pages/client/documents";
import TasksPage from "@/pages/tasks";
import ClientQualityReviews from "@/pages/client/quality-reviews";
import ClientSLA from "@/pages/client/sla";
import ClientSupport from "@/pages/client/support";
import ClientCommunication from "@/pages/client/communication";

interface ProtectedRouteProps {
  component: React.ComponentType;
  isAdmin: boolean;
}

function ProtectedRoute({ component: Component, isAdmin: requireAdmin }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (requireAdmin && !isAdmin) || (!requireAdmin && isAdmin)) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Switch>
      {isAdmin ? (
        <>
          <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} isAdmin={true} />} />
          <Route path="/admin/clients" component={() => <ProtectedRoute component={AdminClients} isAdmin={true} />} />
          <Route path="/admin/client-onboarding" component={() => <ProtectedRoute component={ClientOnboarding} isAdmin={true} />} />
          <Route path="/admin/service-packages" component={() => <ProtectedRoute component={ServicePackages} isAdmin={true} />} />
          <Route path="/admin/documents" component={() => <ProtectedRoute component={AdminDocuments} isAdmin={true} />} />
          <Route path="/admin/credentials" component={() => <ProtectedRoute component={AdminCredentials} isAdmin={true} />} />
          <Route path="/admin/reports" component={() => <ProtectedRoute component={AdminReports} isAdmin={true} />} />
          <Route path="/admin/user-roles" component={() => <ProtectedRoute component={UserRoleManagement} isAdmin={true} />} />
          <Route path="/admin/tasks" component={() => <ProtectedRoute component={TasksPage} isAdmin={true} />} />
          <Route path="/admin/work-allocation" component={() => <ProtectedRoute component={WorkAllocation} isAdmin={true} />} />
          <Route path="/admin/quality-control" component={() => <ProtectedRoute component={QualityControl} isAdmin={true} />} />
          <Route path="/admin/sla-management" component={() => <ProtectedRoute component={SLAManagement} isAdmin={true} />} />
          <Route path="/admin/escalations" component={() => <ProtectedRoute component={Escalations} isAdmin={true} />} />
          <Route path="/admin/compliance-calendar" component={() => <ProtectedRoute component={ComplianceCalendar} isAdmin={true} />} />
        </>
      ) : (
        <>
          <Route path="/client" component={() => <ProtectedRoute component={ClientDashboard} isAdmin={false} />} />
          <Route path="/client/personal-info" component={() => <ProtectedRoute component={PersonalInfo} isAdmin={false} />} />
          <Route path="/client/projects" component={() => <ProtectedRoute component={ClientProjects} isAdmin={false} />} />
          <Route path="/client/projects/:id" component={() => <ProtectedRoute component={ProjectDetails} isAdmin={false} />} />
          <Route path="/client/documents" component={() => <ProtectedRoute component={ClientDocuments} isAdmin={false} />} />
          <Route path="/client/tasks" component={() => <ProtectedRoute component={TasksPage} isAdmin={false} />} />
          <Route path="/client/quality-reviews" component={() => <ProtectedRoute component={ClientQualityReviews} isAdmin={false} />} />
          <Route path="/client/sla" component={() => <ProtectedRoute component={ClientSLA} isAdmin={false} />} />
          <Route path="/client/support" component={() => <ProtectedRoute component={ClientSupport} isAdmin={false} />} />
          <Route path="/client/communication" component={() => <ProtectedRoute component={ClientCommunication} isAdmin={false} />} />
        </>
      )}
      <Route path="/">
        <Redirect to={isAdmin ? "/admin" : "/client"} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;