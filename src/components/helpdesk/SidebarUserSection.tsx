import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionStore } from "@/stores/useSessionStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronUp, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarUserSectionProps {
  collapsed: boolean;
}

export function SidebarUserSection({ collapsed }: SidebarUserSectionProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Read from session store — no DB query
  const storeName = useSessionStore((s) => s.name);
  const userName = storeName || user?.user_metadata?.name || user?.email?.split("@")[0] || "User";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
  };

  const handleAccountSettings = () => {
    setOpen(false);
    const modulePrefix = pathname.match(/^\/(tickets|assets|subscription|system-updates|admin)/)?.[1];
    navigate(modulePrefix ? `/${modulePrefix}/account` : "/account");
  };

  // Single unified render — same DOM in both states
  return (
    <div className="py-1.5 border-t border-border">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center h-8 w-full rounded-lg transition-all duration-200 hover:bg-accent/40 text-left overflow-hidden whitespace-nowrap">
                  <div className="w-12 flex items-center justify-center flex-shrink-0">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{userName}</p>
                  </div>
                  <ChevronUp className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0 mr-2",
                    open && "rotate-180"
                  )} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={8} className="z-50">
                <p className="text-xs">{userName}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} className="w-56">
          <DropdownMenuItem onClick={handleAccountSettings}>
            <User className="h-4 w-4 mr-2" />
            Account Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
