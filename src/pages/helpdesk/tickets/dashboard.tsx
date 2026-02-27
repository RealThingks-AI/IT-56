import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Ticket, AlertTriangle, AlertCircle, Clock, CheckCircle2, 
  Package, BarChart3, Archive, UserX, ArrowRight
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedRequestsStats, useUnifiedRequests } from "@/hooks/useUnifiedRequests";
import { CreateTicketDialog } from "@/components/helpdesk/CreateTicketDialog";
import { CreateProblemDialog } from "@/components/helpdesk/CreateProblemDialog";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getStatusColor, getPriorityColor, formatStatus } from "@/lib/ticketUtils";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  onClick?: () => void;
  tooltip?: string;
}

function StatCard({ title, value, icon, onClick, tooltip }: StatCardProps) {
  const cardContent = (
    <Card 
      className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          {icon}
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-3">
        <Skeleton className="h-4 w-4 mb-1" />
        <Skeleton className="h-7 w-12 mb-1" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

export default function TicketsDashboard() {
  const navigate = useNavigate();
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createProblemOpen, setCreateProblemOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useUnifiedRequestsStats();
  const { data: recentTickets, isLoading: ticketsLoading } = useUnifiedRequests('all');

  const { data: allProblems } = useQuery({
    queryKey: ['helpdesk-problems-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('helpdesk_problems')
        .select('id, status')
        .eq('is_deleted', false);
      if (error) throw error;
      return data || [];
    }
  });

  // Get 5 most recent tickets
  const latestTickets = (recentTickets || []).slice(0, 5);

  const ticketStats = [
    { 
      id: "total", 
      title: "Total", 
      value: stats?.tickets?.total || 0, 
      icon: <Ticket className="h-4 w-4 text-blue-500" />,
      onClick: () => navigate("/tickets/list?requestType=ticket"),
      tooltip: "All tickets"
    },
    { 
      id: "open", 
      title: "Open", 
      value: stats?.tickets?.open || 0, 
      icon: <AlertCircle className="h-4 w-4 text-blue-500" />,
      onClick: () => navigate("/tickets/list?status=open&requestType=ticket"),
    },
    { 
      id: "in_progress", 
      title: "In Progress", 
      value: stats?.tickets?.inProgress || 0, 
      icon: <Clock className="h-4 w-4 text-purple-500" />,
      onClick: () => navigate("/tickets/list?status=in_progress&requestType=ticket"),
    },
    { 
      id: "on_hold", 
      title: "On Hold", 
      value: stats?.tickets?.onHold || 0, 
      icon: <Clock className="h-4 w-4 text-yellow-500" />,
      onClick: () => navigate("/tickets/list?status=on_hold&requestType=ticket"),
    },
    { 
      id: "resolved", 
      title: "Resolved", 
      value: stats?.tickets?.resolved || 0, 
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      onClick: () => navigate("/tickets/list?status=resolved&requestType=ticket"),
    },
    { 
      id: "urgent", 
      title: "Urgent", 
      value: stats?.tickets?.urgent || 0, 
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      onClick: () => navigate("/tickets/list?priority=urgent&requestType=ticket"),
    },
  ];

  const serviceRequestStats = [
    { 
      id: "sr_total", 
      title: "Total", 
      value: stats?.serviceRequests?.total || 0, 
      icon: <Package className="h-4 w-4 text-primary" />,
      onClick: () => navigate("/tickets/list?requestType=service_request")
    },
    { 
      id: "sr_pending", 
      title: "Pending", 
      value: stats?.serviceRequests?.pending || 0, 
      icon: <Clock className="h-4 w-4 text-blue-500" />,
      onClick: () => navigate("/tickets/list?requestType=service_request&status=open")
    },
    { 
      id: "sr_fulfilled", 
      title: "Fulfilled", 
      value: stats?.serviceRequests?.fulfilled || 0, 
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      onClick: () => navigate("/tickets/list?requestType=service_request&status=fulfilled")
    },
  ];

  const problemStats = [
    { 
      id: "prob_total", 
      title: "Total", 
      value: allProblems?.length || 0, 
      icon: <AlertTriangle className="h-4 w-4 text-primary" />,
      onClick: () => navigate("/tickets/problems")
    },
    { 
      id: "prob_open", 
      title: "Open", 
      value: allProblems?.filter(p => p.status === 'open').length || 0, 
      icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
      onClick: () => navigate("/tickets/problems?status=open")
    },
    { 
      id: "prob_known", 
      title: "Known Errors", 
      value: allProblems?.filter(p => p.status === 'known_error').length || 0, 
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      onClick: () => navigate("/tickets/problems?status=known_error")
    },
  ];

  return (
    <TooltipProvider>
    <div className="h-full flex flex-col bg-background">
      {/* Top bar with actions - no duplicate title */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-end gap-2 px-4 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/tickets/reports")}
            className="gap-1 h-7"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="text-xs">Reports</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/tickets/archive")}
            className="gap-1 h-7"
          >
            <Archive className="h-3.5 w-3.5" />
            <span className="text-xs">Archive</span>
          </Button>
          <Button size="sm" onClick={() => setCreateTicketOpen(true)} className="gap-1 h-7">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">New Ticket</span>
          </Button>
          <Button size="sm" onClick={() => setCreateProblemOpen(true)} variant="outline" className="gap-1 h-7">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">New Problem</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tickets Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tickets</h3>
            <Button variant="link" size="sm" className="h-5 text-xs p-0" onClick={() => navigate("/tickets/list?requestType=ticket")}>
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {statsLoading ? (
              Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              ticketStats.map((stat) => (
                <StatCard
                  key={stat.id}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  onClick={stat.onClick}
                  tooltip={stat.tooltip}
                />
              ))
            )}
          </div>
        </div>

        {/* Two Column Layout: Recent Activity + Service Requests & Problems */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Button variant="link" size="sm" className="h-5 text-xs p-0" onClick={() => navigate("/tickets/list")}>
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {ticketsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : latestTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent tickets</p>
              ) : (
                <div className="space-y-1">
                  {latestTickets.map((ticket: any) => (
                    <div 
                      key={ticket.id}
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-mono text-xs text-muted-foreground shrink-0">{ticket.ticket_number}</span>
                        <span className="text-sm truncate">{ticket.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-xs font-medium", getPriorityColor(ticket.priority).includes("red") ? "text-red-600" : getPriorityColor(ticket.priority).includes("orange") ? "text-orange-600" : "text-muted-foreground")}>
                          {ticket.priority}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            ticket.status === 'open' ? "bg-blue-500" :
                            ticket.status === 'in_progress' ? "bg-purple-500" :
                            ticket.status === 'resolved' ? "bg-green-500" :
                            ticket.status === 'on_hold' ? "bg-yellow-500" : "bg-gray-400"
                          )} />
                          <span className="text-xs text-muted-foreground">{formatStatus(ticket.status)}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Requests & Problems */}
          <div className="space-y-4">
            {/* Service Requests */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service Requests</h3>
                <Button variant="link" size="sm" className="h-5 text-xs p-0" onClick={() => navigate("/tickets/list?requestType=service_request")}>
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {statsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
                ) : (
                  serviceRequestStats.map((stat) => (
                    <StatCard
                      key={stat.id}
                      title={stat.title}
                      value={stat.value}
                      icon={stat.icon}
                      onClick={stat.onClick}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Problems */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Problems</h3>
                <Button variant="link" size="sm" className="h-5 text-xs p-0" onClick={() => navigate("/tickets/problems")}>
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {statsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
                ) : (
                  problemStats.map((stat) => (
                    <StatCard
                      key={stat.id}
                      title={stat.title}
                      value={stat.value}
                      icon={stat.icon}
                      onClick={stat.onClick}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateTicketDialog 
        open={createTicketOpen} 
        onOpenChange={setCreateTicketOpen} 
      />
      <CreateProblemDialog 
        open={createProblemOpen} 
        onOpenChange={setCreateProblemOpen} 
      />
    </div>
    </TooltipProvider>
  );
}
