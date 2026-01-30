import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface EventsTabProps {
  assetId: string;
}

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
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as HistoryEvent[];
    },
    enabled: !!assetId,
  });

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      created: "bg-green-100 text-green-800",
      updated: "bg-blue-100 text-blue-800",
      checked_out: "bg-purple-100 text-purple-800",
      checked_in: "bg-teal-100 text-teal-800",
      status_changed: "bg-amber-100 text-amber-800",
      deleted: "bg-red-100 text-red-800",
      replicated: "bg-indigo-100 text-indigo-800",
    };
    
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${actionColors[action] || "bg-gray-100 text-gray-800"}`}>
        {action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No events recorded for this asset</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(event.action)}
                    {event.old_value && event.new_value && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="truncate max-w-[100px]">{event.old_value}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="truncate max-w-[100px] text-foreground">{event.new_value}</span>
                      </div>
                    )}
                  </div>
                  {event.details && typeof event.details === 'object' && Object.keys(event.details).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {JSON.stringify(event.details).substring(0, 100)}
                      {JSON.stringify(event.details).length > 100 && "..."}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {event.performed_by && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {event.performed_by.substring(0, 8)}...
                      </span>
                    )}
                    {event.created_at && (
                      <span>{format(new Date(event.created_at), "dd MMM yyyy, HH:mm")}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};