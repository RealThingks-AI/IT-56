import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { ChevronUp, Settings, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarUserSectionProps {
  collapsed: boolean;
}

export function SidebarUserSection({ collapsed }: SidebarUserSectionProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: userProfile } = useQuery({
    queryKey: ["sidebar-user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - profile rarely changes
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  const userName = userProfile?.name || user?.email?.split("@")[0] || "User";
  const userRole = userProfile?.role || "User";
  const userEmail = userProfile?.email || user?.email || "";

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
    navigate("/account");
  };

  if (collapsed) {
    return (
      <div className="p-1.5 border-t border-border">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center h-8 w-full rounded-lg transition-all duration-200 hover:bg-accent/40">
                    <div className="w-12 flex items-center justify-center flex-shrink-0">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="z-50">
                <p className="text-xs">{userName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent side="right" align="end" className="w-56">
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

  return (
    <div className="p-1.5 border-t border-border">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center h-8 w-full rounded-lg transition-all duration-200 hover:bg-accent/40 text-left">
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
        <DropdownMenuContent side="top" align="start" className="w-[calc(200px-12px)]">
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
