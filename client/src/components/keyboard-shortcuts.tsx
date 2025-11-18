import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Navigation,
  Zap,
  Settings,
  Command,
} from "lucide-react";

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: "Navigation",
    icon: Navigation,
    items: [
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["G", "then", "D"], description: "Go to Dashboard" },
      { keys: ["G", "then", "C"], description: "Go to Clients" },
      { keys: ["G", "then", "T"], description: "Go to Tasks" },
      { keys: ["G", "then", "R"], description: "Go to Reports" },
    ],
  },
  {
    category: "Quick Actions",
    icon: Zap,
    items: [
      { keys: ["N", "then", "C"], description: "New Client" },
      { keys: ["N", "then", "T"], description: "New Task" },
      { keys: ["N", "then", "D"], description: "New Document" },
      { keys: ["/"], description: "Focus search" },
    ],
  },
  {
    category: "General",
    icon: Command,
    items: [
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close dialog/modal" },
      { keys: ["Ctrl", "S"], description: "Save changes" },
      { keys: ["Ctrl", "Enter"], description: "Submit form" },
    ],
  },
  {
    category: "Settings",
    icon: Settings,
    items: [
      { keys: ["Ctrl", "Shift", "D"], description: "Toggle dark mode" },
      { keys: ["Ctrl", ","], description: "Open settings" },
    ],
  },
];

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate and work more efficiently
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section, idx) => (
            <div key={section.category}>
              <div className="flex items-center gap-2 mb-3">
                <section.icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">{section.category}</h3>
              </div>

              <div className="space-y-2">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <div key={keyIdx} className="flex items-center gap-1">
                          {keyIdx > 0 && key !== "then" && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                          {key === "then" ? (
                            <span className="text-xs text-muted-foreground px-1">then</span>
                          ) : (
                            <kbd className="pointer-events-none inline-flex h-6 min-w-6 select-none items-center justify-center gap-1 rounded border bg-muted px-2 font-mono text-[11px] font-medium text-muted-foreground">
                              {key}
                            </kbd>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {idx < shortcuts.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-blue-200 dark:bg-blue-800 rounded">?</kbd> anywhere to quickly access this shortcuts guide.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
