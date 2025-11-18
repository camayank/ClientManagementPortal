import { Users, ListTodo, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
  trend?: "up" | "down";
  variant?: "default" | "warning" | "danger";
  tooltip?: string;
}

function StatItem({ icon: Icon, label, value, trend, variant = "default", tooltip }: StatItemProps) {
  const variantStyles = {
    default: "text-blue-600 bg-blue-50",
    warning: "text-amber-600 bg-amber-50",
    danger: "text-red-600 bg-red-50",
  };

  const content = (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 hover:shadow-md transition-shadow cursor-default">
      <div className={cn("p-1.5 rounded-md", variantStyles[variant])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground leading-none">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold leading-none mt-1">{value}</span>
          {trend && (
            <TrendingUp className={cn(
              "h-3 w-3",
              trend === "up" ? "text-green-600" : "text-red-600 rotate-180"
            )} />
          )}
        </div>
      </div>
    </div>
  );

  if (!tooltip) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function HeaderStats() {
  return (
    <div className="flex items-center gap-3">
      <StatItem
        icon={Users}
        label="Active Clients"
        value={127}
        trend="up"
        tooltip="Total active clients across all jurisdictions"
      />
      <StatItem
        icon={ListTodo}
        label="Pending Tasks"
        value={34}
        variant="warning"
        tooltip="Tasks pending completion this week"
      />
      <StatItem
        icon={AlertTriangle}
        label="Escalations"
        value={5}
        variant="danger"
        tooltip="Active escalations requiring attention"
      />
    </div>
  );
}
