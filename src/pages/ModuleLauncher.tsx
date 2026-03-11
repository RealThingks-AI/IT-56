import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useHelpdeskStats } from "@/hooks/tickets/useHelpdeskStats";
import { useITAMStats } from "@/hooks/assets/useITAMStats";
import { useSubscriptionStats } from "@/hooks/subscriptions/useSubscriptionStats";


import { HeaderUserSection } from "@/components/HeaderUserSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSessionStore } from "@/stores/useSessionStore";
import {
  Ticket, Package, CreditCard, LucideIcon,
  ChevronRight, Plus, PackagePlus, BarChart3, Calendar,
  ClipboardList, Network, ShieldAlert, UserPlus,
} from "lucide-react";
import appLogo from "@/assets/app-logo.png";

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  url: string;
  color: string;
  borderColor: string;
  stat?: string;
  badge?: string;
}

export default function ModuleLauncher() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const storeName = useSessionStore(s => s.name);
  const userName = storeName || user?.user_metadata?.name || "there";

  const { data: ticketStats } = useHelpdeskStats();
  const { data: assetStats } = useITAMStats();
  const { data: subStats } = useSubscriptionStats();
  
  

  if (!loading && !user) return <Navigate to="/login" replace />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const modules: ModuleCard[] = [
    {
      id: "tickets",
      title: "Tickets",
      description: "Manage helpdesk tickets, problems, SLA & queues",
      icon: Ticket,
      url: "/tickets",
      color: "bg-blue-500/10 text-blue-600",
      borderColor: "border-t-blue-500",
      stat: ticketStats ? `${ticketStats.open ?? 0} open` : undefined,
      badge: ticketStats ? `${ticketStats.slaCompliance ?? 100}% SLA` : undefined,
    },
    {
      id: "assets",
      title: "Assets",
      description: "IT asset management, tracking & lifecycle",
      icon: Package,
      url: "/assets/dashboard",
      color: "bg-emerald-500/10 text-emerald-600",
      borderColor: "border-t-emerald-500",
      stat: assetStats ? `${assetStats.totalAssets} assets` : undefined,
    },
    {
      id: "subscriptions",
      title: "Subscriptions",
      description: "Software subscriptions, licenses & payments",
      icon: CreditCard,
      url: "/subscription",
      color: "bg-violet-500/10 text-violet-600",
      borderColor: "border-t-violet-500",
      stat: subStats ? `${subStats.activeTools} active` : undefined,
    },
    {
      id: "it-tasks",
      title: "IT Tasks",
      description: "Day-to-day IT work items, Kanban board & tracking",
      icon: ClipboardList,
      url: "/it-tasks",
      color: "bg-sky-500/10 text-sky-600",
      borderColor: "border-t-sky-500",
      stat: undefined,
    },
    {
      id: "network-monitoring",
      title: "Network Monitoring",
      description: "Servers, switches, routers & infrastructure status",
      icon: Network,
      url: "/network-monitoring",
      color: "bg-orange-500/10 text-orange-600",
      borderColor: "border-t-orange-500",
      stat: undefined,
    },
    {
      id: "endpoint-security",
      title: "Endpoint Security",
      description: "Antivirus, patches, encryption & compliance",
      icon: ShieldAlert,
      url: "/endpoint-security",
      color: "bg-red-500/10 text-red-600",
      borderColor: "border-t-red-500",
      stat: undefined,
    },
    {
      id: "onoff-boarding",
      title: "Boarding",
      description: "Employee IT provisioning & deprovisioning workflows",
      icon: UserPlus,
      url: "/onoff-boarding",
      color: "bg-teal-500/10 text-teal-600",
      borderColor: "border-t-teal-500",
      stat: undefined,
    },
  ];

  const quickActions = [
    { label: "New Ticket", icon: Plus, url: "/tickets/create" },
    { label: "Add Asset", icon: PackagePlus, url: "/assets/add" },
    { label: "Reports", icon: BarChart3, url: "/tickets/reports" },
  ];

  const visibleModules = modules;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={appLogo} alt="RT-IT-Hub" className="w-8 h-8" />
            <span className="text-base font-semibold text-primary">RT-IT-Hub</span>
          </div>
          <HeaderUserSection />
        </div>
      </header>

      {/* Main content */}
      <main className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 flex-1">
        {/* Greeting */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{greeting}, {userName}</h1>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{today}</span>
            </div>
          </div>
        </div>


        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleModules.map(mod => (
            <Card
              key={mod.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 group border-t-4 ${mod.borderColor}`}
              onClick={() => navigate(mod.url)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3.5 rounded-xl ${mod.color}`}>
                    <mod.icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {mod.title}
                      </h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                      {mod.stat && (
                        <span className="text-xs font-medium text-primary">{mod.stat}</span>
                      )}
                      {mod.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {mod.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="w-full px-4 sm:px-6 lg:px-10 h-10 flex items-center justify-between text-xs text-muted-foreground">
          <span>RT-IT-Hub</span>
          <span>{today}</span>
        </div>
      </footer>
    </div>
  );
}
