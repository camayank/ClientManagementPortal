import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/hooks/use-error-boundary";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";

// Admin imports
import AdminDashboard from "@/pages/admin/dashboard";
import AdminClients from "@/pages/admin/clients";
import ClientDetail from "@/pages/admin/client-detail";
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

function Router() {
  return (
    <Switch>
      {/* Admin Routes - Accessible to all */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/clients/:id" component={ClientDetail} />
      <Route path="/admin/clients" component={AdminClients} />
      <Route path="/admin/client-onboarding" component={ClientOnboarding} />
      <Route path="/admin/service-packages" component={ServicePackages} />
      <Route path="/admin/documents" component={AdminDocuments} />
      <Route path="/admin/credentials" component={AdminCredentials} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/user-roles" component={UserRoleManagement} />
      <Route path="/admin/tasks" component={TasksPage} />
      <Route path="/admin/work-allocation" component={WorkAllocation} />
      <Route path="/admin/quality-control" component={QualityControl} />
      <Route path="/admin/sla-management" component={SLAManagement} />
      <Route path="/admin/escalations" component={Escalations} />
      <Route path="/admin/compliance-calendar" component={ComplianceCalendar} />

      {/* Client Routes - Accessible to all */}
      <Route path="/client" component={ClientDashboard} />
      <Route path="/client/personal-info" component={PersonalInfo} />
      <Route path="/client/projects" component={ClientProjects} />
      <Route path="/client/projects/:id" component={ProjectDetails} />
      <Route path="/client/documents" component={ClientDocuments} />
      <Route path="/client/tasks" component={TasksPage} />
      <Route path="/client/quality-reviews" component={ClientQualityReviews} />
      <Route path="/client/sla" component={ClientSLA} />
      <Route path="/client/support" component={ClientSupport} />
      <Route path="/client/communication" component={ClientCommunication} />

      {/* Auth page route */}
      <Route path="/auth" component={AuthPage} />

      {/* Default redirect to admin portal */}
      <Route path="/">
        <Redirect to="/admin" />
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