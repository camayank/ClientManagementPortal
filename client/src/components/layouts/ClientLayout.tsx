import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Link } from "wouter";
import { LayoutDashboard, LogOut, FileText, User, FolderKanban } from "lucide-react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useUser();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex h-screen">
        <aside className="w-64 bg-white border-r">
          <div className="p-4">
            <h1 className="text-xl font-bold text-primary">Client Portal</h1>
          </div>
          <nav className="space-y-1 p-2">
            <Link href="/client">
              <Button variant="ghost" className="w-full justify-start">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/client/personal-info">
              <Button variant="ghost" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                Personal Info
              </Button>
            </Link>
            <Link href="/client/projects">
              <Button variant="ghost" className="w-full justify-start">
                <FolderKanban className="mr-2 h-4 w-4" />
                Projects
              </Button>
            </Link>
            <Link href="/client/documents">
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}