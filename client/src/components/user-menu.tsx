import { useState } from "react";
import {
  User,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Monitor,
  Keyboard,
  LogOut,
  Bell,
  Languages,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface UserMenuProps {
  onThemeChange?: (theme: "light" | "dark" | "system") => void;
  onShowKeyboardShortcuts?: () => void;
}

export function UserMenu({ onThemeChange, onShowKeyboardShortcuts }: UserMenuProps) {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/10">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=demo" alt="User" />
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              DU
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Demo User</p>
            <p className="text-xs leading-none text-muted-foreground">
              demo@cpaportal.com
            </p>
            <Badge variant="outline" className="w-fit mt-1">
              Administrator
            </Badge>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {theme === "light" && <Sun className="mr-2 h-4 w-4" />}
              {theme === "dark" && <Moon className="mr-2 h-4 w-4" />}
              {theme === "system" && <Monitor className="mr-2 h-4 w-4" />}
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Languages className="mr-2 h-4 w-4" />
              <span>Language</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>
                <span>🇺🇸 English</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>🇪🇸 Español</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>🇫🇷 Français</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>🇩🇪 Deutsch</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>🇨🇳 中文</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>🇯🇵 日本語</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem>
            <Bell className="mr-2 h-4 w-4" />
            <span>Notification Settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Palette className="mr-2 h-4 w-4" />
            <span>Appearance</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onShowKeyboardShortcuts}>
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">?</span>
            </kbd>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
