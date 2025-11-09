import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  illustration?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      {illustration ? (
        <img
          src={illustration}
          alt=""
          className="w-64 h-64 mb-6 opacity-50"
        />
      ) : (
        <div className="rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-8 mb-6 shadow-inner">
          <Icon className="h-16 w-16 text-gray-400" />
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md leading-relaxed">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
