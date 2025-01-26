import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin/dashboard";
import ClientDashboard from "@/pages/client/dashboard";
import AdminClients from "@/pages/admin/clients";
import AdminDocuments from "@/pages/admin/documents";
import AdminCredentials from "@/pages/admin/credentials";
import ClientDocuments from "@/pages/client/documents";
import PersonalInfo from "@/pages/client/personal-info";
import ClientProjects from "@/pages/client/projects";
import ProjectDetails from "@/pages/client/project-details";
import AdminReports from "@/pages/admin/reports";
import RoleManagement from "@/pages/role-management";
import UserRoleManagement from "@/pages/admin/user-roles";
import ClientOnboarding from "@/pages/admin/client-onboarding";
import ServicePackages from "@/pages/admin/service-packages";

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
  const { user, isLoading, isAdmin } = useUser();

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
          <Route path="/admin/roles" component={() => <ProtectedRoute component={RoleManagement} isAdmin={true} />} />
          <Route path="/admin/user-roles" component={() => <ProtectedRoute component={UserRoleManagement} isAdmin={true} />} />
        </>
      ) : (
        <>
          <Route path="/client" component={() => <ProtectedRoute component={ClientDashboard} isAdmin={false} />} />
          <Route path="/client/personal-info" component={() => <ProtectedRoute component={PersonalInfo} isAdmin={false} />} />
          <Route path="/client/projects" component={() => <ProtectedRoute component={ClientProjects} isAdmin={false} />} />
          <Route path="/client/projects/:id" component={() => <ProtectedRoute component={ProjectDetails} isAdmin={false} />} />
          <Route path="/client/documents" component={() => <ProtectedRoute component={ClientDocuments} isAdmin={false} />} />
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
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;