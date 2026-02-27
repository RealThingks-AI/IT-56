import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, History, User, ArrowRight } from "lucide-react";

interface HistoryTabProps {
  assetId: string;
}

interface HistoryDetails {
  [key: string]: any;
}

export const HistoryTab = ({ assetId }: HistoryTabProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ["asset-history", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_asset_history")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!assetId,
  });

  const { data: usersData = [] } = useQuery({
    queryKey: ["users-for-history"],
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
    updated: "bg-blue-100 text-blue-800",
    checked_out: "bg-purple-100 text-purple-800",
    checked_in: "bg-teal-100 text-teal-800",
    status_changed: "bg-amber-100 text-amber-800",
    deleted: "bg-red-100 text-red-800",
    replicated: "bg-indigo-100 text-indigo-800",
    audit_recorded: "bg-orange-100 text-orange-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    repair: "bg-rose-100 text-rose-800",
  };

  const formatDetailValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "";
    if (key.includes("date") || key.includes("return") || key.includes("at")) {
      try { return format(new Date(value), "dd/MM/yyyy HH:mm"); } catch { return String(value); }
    }
    return String(value);
  };

  const renderDetails = (details: HistoryDetails | null) => {
    if (!details || typeof details !== 'object') return null;
    const excludeKeys = ['checkout_type', 'user_id', 'location_id', 'department_id'];
    const entries = Object.entries(details)
      .filter(([key, value]) => !excludeKeys.includes(key) && value !== null && value !== undefined && value !== '');
    if (entries.length === 0) return null;
    return (
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        {entries.map(([key, value]) => (
          <p key={key}>
            {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}:{' '}
            <span className="text-foreground">{formatDetailValue(key, value)}</span>
          </p>
        ))}
      </div>
    );
  };

  // Group by date
  const groupByDate = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    items.forEach(item => {
      const date = item.created_at ? format(new Date(item.created_at), "dd MMM yyyy") : "Unknown";
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-8 text-center text-muted-foreground">Loading history...</CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="p-8 text-center">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground">No history available for this asset</p>
        </CardContent>
      </Card>
    );
  }

  const grouped = groupByDate(history);

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[15px] top-6 bottom-2 w-0.5 bg-border" />

          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-4">
              <div className="text-xs font-semibold text-muted-foreground mb-2 ml-9 uppercase tracking-wide">{date}</div>
              <div className="space-y-1">
                {items.map((item: any) => {
                  const performedByName = getUserName(item.performed_by);
                  const details = item.details as HistoryDetails | null;
                  return (
                    <div key={item.id} className="flex gap-3 py-1.5 relative">
                      <div className="flex-shrink-0 w-[30px] flex justify-center z-10 mt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 border-2 border-background" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${actionColors[item.action] || "bg-gray-100 text-gray-800"} text-xs`}>
                            {item.action.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </Badge>
                        </div>
                        {item.old_value && item.new_value && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <span className="truncate max-w-[120px]">{item.old_value}</span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[120px] text-foreground font-medium">{item.new_value}</span>
                          </div>
                        )}
                        {item.new_value && !item.old_value && item.action !== "audit_recorded" && (
                          <p className="text-xs text-muted-foreground mt-1">→ {item.new_value}</p>
                        )}
                        {renderDetails(details)}
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(item.created_at), "HH:mm")}
                          </p>
                          {performedByName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />{performedByName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
