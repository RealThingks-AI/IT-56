import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LucideIcon, User, Shield, LogOut } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useSessionStore } from "@/stores/useSessionStore";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import appLogo from "@/assets/app-logo.png";

export interface SidebarItem {
  title: string;
  url: string;
  icon: LucideIcon;
  children?: { title: string; url: string; icon?: LucideIcon }[];
}

interface ModuleSidebarProps {
  moduleName: string;
  moduleIcon: LucideIcon;
  items: SidebarItem[];
}

const ICON_CONTAINER = "w-[60px] flex items-center justify-center flex-shrink-0";

export function ModuleSidebar({ moduleName, moduleIcon: ModuleIcon, items }: ModuleSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const storeName = useSessionStore(s => s.name);

  const { data: userProfile } = useQuery({
    queryKey: ["sidebar-user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("users")
        .select("name, avatar_url")
        .eq("auth_user_id", user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const userName = storeName || userProfile?.name || user?.user_metadata?.name || "User";
  const avatarUrl = userProfile?.avatar_url;
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Auto-expand active section
  useEffect(() => {
    items.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(c =>
          location.pathname === c.url || location.pathname.startsWith(c.url + "/")
        );
        if (isChildActive && !expandedSections.includes(item.title)) {
          setExpandedSections(prev => [...prev, item.title]);
        }
      }
    });
  }, [location.pathname]);

  const isActive = (url: string) => location.pathname === url || location.pathname.startsWith(url + "/");

  const toggleSection = (title: string) => {
    setExpandedSections(prev => prev.includes(title) ? prev.filter(s => s !== title) : [...prev, title]);
  };

  const wrapTooltip = (key: string, label: string, child: React.ReactElement) => (
    <TooltipProvider key={key} delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{child}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}><p className="text-xs">{label}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const renderItem = (item: SidebarItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item.url) || item.children?.some(c => isActive(c.url));
    const isExpanded = !collapsed && expandedSections.includes(item.title);

    const baseStyles = cn(
      "flex items-center h-9 rounded-lg transition-all duration-200 text-sm w-full overflow-hidden whitespace-nowrap",
      active ? "text-primary bg-accent" : "text-foreground hover:text-primary hover:bg-accent/40"
    );

    if (!hasChildren) {
      const link = (
        <NavLink to={item.url} end className={baseStyles}>
          <div className={ICON_CONTAINER}>
            <item.icon className="h-4 w-4" />
          </div>
          <span className="truncate">{item.title}</span>
        </NavLink>
      );

      return collapsed ? wrapTooltip(item.title, item.title, link) : <div key={item.title}>{link}</div>;
    }

    // Sections with children — always render Collapsible
    const sectionUrl = item.children?.[0]?.url || item.url;

    return (
      <TooltipProvider key={item.title} delayDuration={0}>
        <Tooltip>
          <Collapsible open={isExpanded} onOpenChange={() => !collapsed && toggleSection(item.title)}>
            <TooltipTrigger asChild>
              <CollapsibleTrigger asChild>
                <button
                  className={baseStyles}
                  onClick={(e) => {
                    if (collapsed) {
                      e.preventDefault();
                      navigate(sectionUrl);
                    }
                  }}
                >
                  <div className={ICON_CONTAINER}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left truncate">{item.title}</span>
                  <ChevronRight className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0 mr-2",
                    isExpanded && "rotate-90"
                  )} />
                </button>
              </CollapsibleTrigger>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={8} className="z-50">
                <p className="text-xs">{item.title}</p>
              </TooltipContent>
            )}
            <CollapsibleContent className="mt-0.5 space-y-0.5">
              {item.children?.map(child => {
                const childActive = isActive(child.url);
                const Icon = child.icon;
                return (
                  <NavLink key={child.title} to={child.url} className={cn(
                    "flex items-center h-7 px-2.5 rounded-md text-xs transition-all duration-200 border-l-2 ml-5 pl-4",
                    childActive ? "text-primary bg-accent/70 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border-border"
                  )}>
                    {Icon && <Icon className="h-3 w-3 mr-2 flex-shrink-0" />}
                    <span className="truncate">{child.title}</span>
                  </NavLink>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const collapseButton = (
    <button onClick={() => setCollapsed(!collapsed)} className="flex items-center h-9 w-full rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 overflow-hidden whitespace-nowrap">
      <div className={ICON_CONTAINER}>
        <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")} />
      </div>
      <span>Collapse</span>
    </button>
  );

  const userTrigger = (
    <button className="flex items-center h-9 w-full rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 overflow-hidden whitespace-nowrap">
      <div className={ICON_CONTAINER}>
        <Avatar className="h-6 w-6 border border-primary/30">
          <AvatarImage src={avatarUrl || undefined} alt={userName} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[9px]">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
      <span className="truncate text-foreground font-medium">{userName}</span>
    </button>
  );

  return (
    <aside className="h-screen flex flex-col bg-background transition-all duration-300 ease-in-out border-r border-border shrink-0"
      style={{ width: collapsed ? "60px" : "180px", minWidth: collapsed ? "60px" : "180px", maxWidth: collapsed ? "60px" : "180px" }}>
      
      {/* Header */}
      <div 
        className="flex items-center border-b border-border h-11 cursor-pointer hover:bg-accent/40 transition-colors overflow-hidden whitespace-nowrap"
        onClick={() => navigate("/")}
      >
        <div className={ICON_CONTAINER}>
          <img src={appLogo} alt="RealThingks" className="h-8 w-8 object-contain" />
        </div>
        <span className="text-sm font-semibold text-primary whitespace-nowrap">{moduleName}</span>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-2 space-y-1",
        collapsed ? "overflow-hidden" : "overflow-y-auto"
      )}>
        {items.map(renderItem)}
      </nav>

      {/* Collapse */}
      <div className="border-t border-border py-1.5">
        {collapsed ? wrapTooltip("collapse", "Expand", collapseButton) : collapseButton}
      </div>

      {/* User Section */}
      <div className="border-t border-border py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {collapsed ? wrapTooltip("user", userName, userTrigger) : userTrigger}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-foreground">{userName}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/account")}>
              <User className="mr-2 h-4 w-4" />
              My Account
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/admin/users")}>
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </aside>
  );
}
