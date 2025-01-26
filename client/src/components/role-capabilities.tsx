import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const ROLE_CAPABILITIES = {
  manager: {
    title: "Manager",
    description: "Strategic planning and high-level approval capabilities",
    capabilities: [
      "Full user management",
      "Complete client oversight",
      "Project management and planning",
      "Document management and approval",
      "Report generation and analysis",
      "Strategic planning access",
      "High-level approvals",
    ],
    accessLevel: "High",
    icon: "👔"
  },
  partner: {
    title: "Partner",
    description: "Full visibility and strategic planning capabilities",
    capabilities: [
      "Complete system access",
      "Strategic planning",
      "Client relationship management",
      "Project oversight",
      "Document approval",
      "Report analysis",
      "Team performance review"
    ],
    accessLevel: "Highest",
    icon: "🤝"
  },
  team_lead: {
    title: "Team Lead",
    description: "Task assignment and team performance tracking",
    capabilities: [
      "Team management",
      "Task assignment",
      "Project coordination",
      "Document review",
      "Performance tracking",
      "Workflow optimization",
      "Limited approvals"
    ],
    accessLevel: "Medium",
    icon: "👥"
  },
  staff_accountant: {
    title: "Staff Accountant",
    description: "Day-to-day tasks and document processing",
    capabilities: [
      "Document processing",
      "Task completion",
      "Basic client data access",
      "Project status viewing",
      "Regular report generation"
    ],
    accessLevel: "Standard",
    icon: "📊"
  },
  quality_reviewer: {
    title: "Quality Reviewer",
    description: "Quality assurance and review processes",
    capabilities: [
      "Document review",
      "Quality assessment",
      "Process verification",
      "Standards compliance",
      "Feedback provision"
    ],
    accessLevel: "Medium",
    icon: "✓"
  },
  compliance_officer: {
    title: "Compliance Officer",
    description: "Regulatory compliance and deadline management",
    capabilities: [
      "Compliance monitoring",
      "Regulatory updates",
      "Deadline tracking",
      "Document review",
      "Risk assessment"
    ],
    accessLevel: "Medium",
    icon: "⚖️"
  }
};

export function RoleCapabilitiesView() {
  return (
    <ScrollArea className="h-[500px] w-full rounded-md border p-4">
      <div className="grid gap-4">
        {Object.entries(ROLE_CAPABILITIES).map(([key, role]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{role.icon}</span>
                {role.title}
                <span className="ml-auto text-sm text-muted-foreground">
                  Access Level: {role.accessLevel}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
              <ul className="list-disc pl-6 space-y-1">
                {role.capabilities.map((capability, index) => (
                  <li key={index} className="text-sm">{capability}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
