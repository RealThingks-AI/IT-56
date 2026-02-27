import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface EventsTabProps {
  assetId: string;
}

const LIFECYCLE_EVENTS = [
  "created", "checked_out", "checked_in", "status_changed",
  "transferred", "maintenance", "repair", "disposed",
  "lost", "found", "replicated",
];

interface HistoryEvent {
  id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  details: any;
  created_at: string | null;
  performed_by: string | null;
}

export const EventsTab = ({ assetId }: EventsTabProps) => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["asset-events", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_asset_history")
        .select("*")
        .eq("asset_id", assetId)
        .in("action", LIFECYCLE_EVENTS)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as HistoryEvent[];
    },
    enabled: !!assetId,
  });

  const { data: usersData = [] } = useQuery({
    queryKey: ["users-for-events"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email");
      return data || [];
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const user = usersData.find((u) => u.id === userId);
    return user?.name || user?.email || null;
  };

  const actionColors: Record<string, string> = {
    created: "bg-green-100 text-green-800",
    checked_out: "bg-purple-100 text-purple-800",
    checked_in: "bg-teal-100 text-teal-800",
    status_changed: "bg-amber-100 text-amber-800",
    transferred: "bg-blue-100 text-blue-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    repair: "bg-orange-100 text-orange-800",
    disposed: "bg-red-100 text-red-800",
    lost: "bg-red-100 text-red-800",
    found: "bg-green-100 text-green-800",
    replicated: "bg-indigo-100 text-indigo-800",
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No lifecycle events recorded</p>
            <p className="text-xs text-muted-foreground mt-1">
              Events like check-in/out, transfers, and status changes appear here
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />

            <div className="space-y-1">
              {events.map((event) => {
                const performedByName = getUserName(event.performed_by);
                return (
                  <div key={event.id} className="flex items-start gap-3 p-2.5 relative">
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 mt-1 w-[22px] flex justify-center z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${actionColors[event.action] || "bg-gray-100 text-gray-800"} text-xs`}>
                          {event.action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </Badge>
                        {event.old_value && event.new_value && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="truncate max-w-[100px]">{event.old_value}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="truncate max-w-[100px] text-foreground">{event.new_value}</span>
                          </div>
                        )}
                      </div>
                      {event.details && typeof event.details === 'object' && Object.keys(event.details).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {Object.entries(event.details as Record<string, any>)
                            .filter(([key, value]) => !['checkout_type', 'user_id', 'location_id', 'department_id'].includes(key) && value !== null && value !== undefined && value !== '')
                            .map(([key, value]) => {
                              const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                              let displayValue = String(value);
                              if ((key.includes('date') || key.includes('return') || key.includes('at')) && typeof value === 'string') {
                                try { displayValue = format(new Date(value), "dd/MM/yyyy HH:mm"); } catch { /* keep */ }
                              }
                              return <p key={key}>{label}: <span className="text-foreground">{displayValue}</span></p>;
                            })}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {performedByName && (
                          <span className="flex items-center gap-1"><User className="h-3 w-3" />{performedByName}</span>
                        )}
                        {event.created_at && (
                          <span>{format(new Date(event.created_at), "dd MMM yyyy, HH:mm")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
