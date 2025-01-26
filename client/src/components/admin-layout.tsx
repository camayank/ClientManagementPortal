import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users,
  Folder,
  ClipboardList,
  Key,
  BarChart,
  Shield,
  UserPlus,
  Package2,
  LogOut,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useUser();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/admin" className="text-xl font-bold">
                  Admin Portal
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link href="/admin/clients">
                  <Button variant="ghost" className="gap-2">
                    <Users className="h-4 w-4" />
                    Clients
                  </Button>
                </Link>
                <Link href="/admin/client-onboarding">
                  <Button variant="ghost" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Onboarding
                  </Button>
                </Link>
                <Link href="/admin/service-packages">
                  <Button variant="ghost" className="gap-2">
                    <Package2 className="h-4 w-4" />
                    Service Packages
                  </Button>
                </Link>
                <Link href="/admin/documents">
                  <Button variant="ghost" className="gap-2">
                    <Folder className="h-4 w-4" />
                    Documents
                  </Button>
                </Link>
                <Link href="/admin/credentials">
                  <Button variant="ghost" className="gap-2">
                    <Key className="h-4 w-4" />
                    Credentials
                  </Button>
                </Link>
                <Link href="/admin/reports">
                  <Button variant="ghost" className="gap-2">
                    <BarChart className="h-4 w-4" />
                    Reports
                  </Button>
                </Link>
                <Link href="/admin/user-roles">
                  <Button variant="ghost" className="gap-2">
                    <Shield className="h-4 w-4" />
                    User Roles
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-6">
        {children}
      </main>
    </div>
  );
}