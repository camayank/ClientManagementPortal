import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Building2, Users2, ArrowLeftRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notification-center";
import { UserMenu } from "@/components/user-menu";
import { QuickActions } from "@/components/quick-actions";
import { HeaderStats } from "@/components/header-stats";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

interface BaseLayoutProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  sidebar?: ReactNode;
  portalType?: "admin" | "client";
}

export function BaseLayout({ children, className, header, sidebar, portalType }: BaseLayoutProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Listen for '?' key to show shortcuts
  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && !commandOpen) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Global Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md shadow-sm">
        <div className="flex h-16 items-center px-6 gap-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Client Management Portal
              </h1>
              <p className="text-xs text-muted-foreground">Multi-Jurisdiction CPA Platform</p>
            </div>
          </div>

          {/* Search Button - triggers command palette */}
          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2 w-64 justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘K</span>
            </kbd>
          </Button>

          {/* Stats - Only show on larger screens and for admin portal */}
          {portalType === "admin" && (
            <div className="hidden xl:flex">
              <HeaderStats />
            </div>
          )}

          {/* Right side actions */}
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
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
              <ArrowLeftRight className="h-3 w-3 text-muted-foreground hidden sm:block" />
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
                  <span className="hidden sm:inline">Client</span>
                </Button>
              </Link>
            </div>

            {/* Quick Actions - Only for admin */}
            {portalType === "admin" && (
              <div className="hidden lg:block">
                <QuickActions />
              </div>
            )}

            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu */}
            <UserMenu onShowKeyboardShortcuts={() => setShortcutsOpen(true)} />
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
