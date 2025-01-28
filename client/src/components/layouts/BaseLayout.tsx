import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BaseLayoutProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  sidebar?: ReactNode;
}

export function BaseLayout({ children, className, header, sidebar }: BaseLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      {header}
      <div className="flex">
        {sidebar}
        <main className={cn("flex-1 overflow-y-auto", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
