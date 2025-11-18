import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Building2, Users2, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BaseLayoutProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  sidebar?: ReactNode;
  portalType?: "admin" | "client";
}

export function BaseLayout({ children, className, header, sidebar, portalType }: BaseLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Global Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Client Management Portal
              </h1>
              <p className="text-xs text-muted-foreground">Multi-Jurisdiction CPA Platform</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Portal Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <Link href="/admin">
                <Button
                  variant={portalType === "admin" ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 transition-all",
                    portalType === "admin" && "shadow-md"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Admin Portal
                </Button>
              </Link>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <Link href="/client">
                <Button
                  variant={portalType === "client" ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 transition-all",
                    portalType === "client" && "shadow-md"
                  )}
                >
                  <Users2 className="h-4 w-4" />
                  Client Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Custom header if provided */}
      {header}

      {/* Main content area */}
      <div className="flex h-[calc(100vh-4rem)]">
        {sidebar}
        <main className={cn("flex-1 overflow-y-auto", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
