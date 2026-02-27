import { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, Ticket, Package, CreditCard, Activity, BarChart3, Settings, ChevronLeft, ChevronRight, RefreshCw, Download, Monitor, LucideIcon, ClipboardCheck, Key, Building2, ListChecks, Receipt, List, AlertTriangle, ScrollText } from "lucide-react";
import appLogo from "@/assets/app-logo.png";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SidebarUserSection } from "./SidebarUserSection";
import { useUserRole } from "@/hooks/useUserRole";

interface SidebarChild {
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: number;
  children?: SidebarChild[];
}

interface SidebarSection {
  title: string;
  url?: string;
  icon: LucideIcon;
  children?: SidebarChild[];
  parentRoute: string;
  badge?: number;
}

// Asset module sub-sections
const assetChildren: SidebarChild[] = [{
  title: "Dashboard",
  url: "/assets/dashboard",
  icon: LayoutDashboard
}, {
  title: "List of Assets",
  url: "/assets/allassets",
  icon: List
}, {
  title: "Logs",
  url: "/assets/logs",
  icon: ScrollText
}, {
  title: "Advanced",
  url: "/assets/advanced",
  icon: Settings
}];

// Ticket module sub-sections
const ticketChildren: SidebarChild[] = [{
  title: "Dashboard",
  url: "/tickets",
  icon: LayoutDashboard
}, {
  title: "All Tickets",
  url: "/tickets/list",
  icon: List
}, {
  title: "Problems",
  url: "/tickets/problems",
  icon: AlertTriangle
}, {
  title: "Advanced",
  url: "/tickets/settings",
  icon: Settings
}];

const sidebarSections: SidebarSection[] = [{
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard,
  parentRoute: "/"
}, {
  title: "Tickets",
  icon: Ticket,
  parentRoute: "/tickets",
  children: ticketChildren
}, {
  title: "Assets",
  icon: Package,
  parentRoute: "/assets",
  children: assetChildren
}, {
  title: "Subscription",
  icon: CreditCard,
  parentRoute: "/subscription",
  children: [{
    title: "Dashboard",
    url: "/subscription",
    icon: LayoutDashboard
  }, {
    title: "All Subscriptions",
    url: "/subscription/tools",
    icon: ListChecks
  }, {
    title: "Licenses",
    url: "/subscription/licenses",
    icon: Key
  }, {
    title: "Payments",
    url: "/subscription/payments",
    icon: Receipt
  }, {
    title: "Vendors",
    url: "/subscription/vendors",
    icon: Building2
  }]
}, {
  title: "Updates",
  icon: RefreshCw,
  parentRoute: "/system-updates",
  children: [{
    title: "Overview",
    url: "/system-updates",
    icon: LayoutDashboard
  }, {
    title: "All Updates",
    url: "/system-updates/updates",
    icon: Download
  }, {
    title: "Devices",
    url: "/system-updates/devices",
    icon: Monitor
  }, {
    title: "Settings",
    url: "/system-updates/settings",
    icon: Settings
  }]
}, {
  title: "Monitoring",
  url: "/monitoring",
  icon: Activity,
  parentRoute: "/monitoring"
}];

export function HelpdeskSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const { role } = useUserRole();

  // Role-based filtering — instant, no DB query
  const OPEN_ROUTES = ["/", "/tickets", "/assets"];
  const filteredSections = useMemo(() => {
    if (role === "admin") return sidebarSections;
    if (role === "manager") return sidebarSections; // managers see all except settings (handled separately)
    // user/viewer: only open routes
    return sidebarSections.filter(s => OPEN_ROUTES.includes(s.parentRoute));
  }, [role]);

  // Auto-expand section when child route is active
  useEffect(() => {
    const currentPath = location.pathname;
    filteredSections.forEach(section => {
      if (section.children) {
        const isChildActive = section.children.some(child => 
          currentPath === child.url || currentPath.startsWith(child.url + "/")
        );
        if (isChildActive && !expandedSections.includes(section.title)) {
          setExpandedSections(prev => [...prev, section.title]);
        }
      }
    });
  }, [location.pathname, filteredSections]);

  const isActiveExact = (path: string) => location.pathname === path;
  
  const isActiveSection = (section: SidebarSection) => {
    if (section.url === "/") return location.pathname === "/";
    if (section.url && location.pathname === section.url) return true;
    if (section.children) {
      return section.children.some(child => 
        location.pathname === child.url || location.pathname.startsWith(child.url + "/")
      );
    }
    return section.url ? location.pathname.startsWith(section.url + "/") : false;
  };

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) ? [] : [title]
    );
  };

  const isNestedChildActive = (child: SidebarChild): boolean => {
    if (!child.children) return false;
    return child.children.some(subChild => 
      location.pathname === subChild.url || location.pathname.startsWith(subChild.url.split('?')[0])
    );
  };

  const renderNestedChild = (subChild: SidebarChild) => {
    const baseUrl = subChild.url.split('?')[0];
    const active = location.pathname === baseUrl || location.pathname.startsWith(baseUrl);
    const Icon = subChild.icon;
    return (
      <NavLink 
        key={subChild.title} 
        to={subChild.url} 
        className={cn(
          "flex items-center h-6 px-2 rounded-md text-xs transition-all duration-200",
          "ml-6 pl-3",
          active ? "text-primary bg-accent/50" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
        )}
      >
        {Icon && <Icon className="h-3 w-3 mr-2 flex-shrink-0" />}
        <span className="truncate">{subChild.title}</span>
        {subChild.badge !== undefined && subChild.badge > 0 && (
          <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] rounded-md px-1.5 min-w-[18px] text-center">
            {subChild.badge}
          </span>
        )}
      </NavLink>
    );
  };

  const renderChildItem = (child: SidebarChild) => {
    const hasNestedChildren = child.children && child.children.length > 0;
    const isExpanded = expandedSections.includes(`child-${child.title}`);
    const baseUrl = child.url.split('?')[0];
    const active = location.pathname === baseUrl || location.pathname.startsWith(baseUrl);
    const nestedActive = isNestedChildActive(child);
    const Icon = child.icon;

    if (hasNestedChildren) {
      return (
        <Collapsible key={child.title} open={isExpanded} onOpenChange={() => toggleSection(`child-${child.title}`)}>
          <CollapsibleTrigger asChild>
            <button className={cn(
              "flex items-center h-7 w-full px-2.5 rounded-md text-xs transition-all duration-200",
              "border-l-2 ml-3 pl-4",
              active || nestedActive 
                ? "text-primary bg-accent/70 border-primary" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border-border"
            )}>
              {Icon && <Icon className="h-3 w-3 mr-2 flex-shrink-0" />}
              <span className="flex-1 text-left truncate">{child.title}</span>
              {child.badge !== undefined && child.badge > 0 && (
                <span className="mr-1 bg-destructive text-destructive-foreground text-[10px] rounded-md px-1.5 min-w-[18px] text-center">
                  {child.badge}
                </span>
              )}
              <ChevronRight className={cn(
                "h-3 w-3 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                isExpanded && "rotate-90"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0.5 space-y-0.5 overflow-hidden">
            {child.children?.map(subChild => renderNestedChild(subChild))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <NavLink 
        key={child.title} 
        to={child.url} 
        className={cn(
          "flex items-center h-7 px-2.5 rounded-md text-xs transition-all duration-200",
          "border-l-2 ml-3 pl-4",
          active 
            ? "text-primary bg-accent/70 border-primary" 
            : "text-muted-foreground hover:text-foreground hover:bg-accent/40 hover:translate-x-0.5 border-border"
        )}
      >
        {Icon && <Icon className="h-3 w-3 mr-2 flex-shrink-0" />}
        <span className="truncate">{child.title}</span>
        {child.badge !== undefined && child.badge > 0 && (
          <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] rounded-md px-1.5 min-w-[18px] text-center">
            {child.badge}
          </span>
        )}
      </NavLink>
    );
  };

  const renderSection = (section: SidebarSection) => {
    const hasChildren = section.children && section.children.length > 0;
    const isExpanded = !collapsed && expandedSections.includes(section.title);
    const sectionActive = isActiveSection(section);

    const baseStyles = cn(
      "flex items-center h-8 rounded-lg transition-all duration-200 text-sm w-full overflow-hidden whitespace-nowrap",
      sectionActive ? "text-primary bg-accent" : "text-foreground hover:text-primary hover:bg-accent/40"
    );

    // Unified structure for sections WITHOUT children
    if (!hasChildren && section.url) {
      const menuButton = (
        <NavLink to={section.url} end={section.url === "/"} className={baseStyles}>
          <div className="w-12 flex items-center justify-center flex-shrink-0">
            <section.icon className="h-4 w-4" />
          </div>
          <span className="truncate">{section.title}</span>
        </NavLink>
      );

      return (
        <TooltipProvider key={section.title} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={8} className="z-50">
                <p className="text-xs">{section.title}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Unified structure for sections WITH children — always render Collapsible
    const sectionUrl = section.children?.[0]?.url || "/";

    return (
      <TooltipProvider key={section.title} delayDuration={0}>
        <Tooltip>
          <Collapsible open={isExpanded} onOpenChange={() => !collapsed && toggleSection(section.title)}>
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
                  <div className="w-12 flex items-center justify-center flex-shrink-0">
                    <section.icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left truncate">{section.title}</span>
                  {section.badge !== undefined && section.badge > 0 && (
                    <span className="mr-1 bg-destructive text-destructive-foreground text-[10px] rounded-md px-1.5 min-w-[18px] text-center">
                      {section.badge}
                    </span>
                  )}
                  <ChevronRight className={cn(
                    "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0 mr-2",
                    isExpanded && "rotate-90"
                  )} />
                </button>
              </CollapsibleTrigger>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={8} className="z-50">
                <p className="text-xs">{section.title}</p>
              </TooltipContent>
            )}
            <CollapsibleContent className="mt-0.5 space-y-0.5 overflow-hidden">
              {section.children?.map(child => renderChildItem(child))}
            </CollapsibleContent>
          </Collapsible>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // NO skeleton - render immediately with optimistic sections
  return (
    <aside 
      className="h-screen flex flex-col bg-background transition-all duration-300 ease-in-out border-r border-border shrink-0" 
      style={{
        width: collapsed ? "48px" : "200px",
        minWidth: collapsed ? "48px" : "200px",
        maxWidth: collapsed ? "48px" : "200px"
      }}
    >
      {/* Header */}
      <div className="flex items-center border-b border-border h-11 overflow-hidden whitespace-nowrap">
        <div className="w-12 h-11 flex items-center justify-center flex-shrink-0">
          <img src={appLogo} alt="RT-IT-Hub" className="w-7 h-7" />
        </div>
        <span className="text-sm font-semibold text-primary whitespace-nowrap">
          RT-IT-Hub
        </span>
      </div>

      {/* Main Navigation - No skeleton, render optimistically */}
      <nav className={cn("flex-1 py-2 space-y-0.5", collapsed ? "overflow-hidden" : "overflow-y-auto")}>
        {filteredSections.map(section => renderSection(section))}
      </nav>

      {/* Collapse Button */}
      <div className="border-t border-border py-1.5">
        {(() => {
          const collapseButton = (
            <button 
              onClick={() => setCollapsed(!collapsed)} 
              className="flex items-center h-8 w-full rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 overflow-hidden whitespace-nowrap"
            >
              <div className="w-12 flex items-center justify-center flex-shrink-0">
                <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")} />
              </div>
              <span>Collapse</span>
            </button>
          );
          if (collapsed) {
            return (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>{collapseButton}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="z-50">
                    <p className="text-xs">Expand sidebar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return collapseButton;
        })()}
      </div>

      {/* User Section */}
      <SidebarUserSection collapsed={collapsed} />
    </aside>
  );
}
