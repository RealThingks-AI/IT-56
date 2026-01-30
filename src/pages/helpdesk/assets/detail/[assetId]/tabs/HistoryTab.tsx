import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Clock, History } from "lucide-react";

interface HistoryTabProps {
  assetId: string;
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

  const getTitle = (item: any) => {
    const action = item.action || "Unknown action";
    return action.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading history...</div>;
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground">No history available for this asset</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          {history.map((item) => (
            <div key={item.id} className="flex gap-3 py-2 border-b last:border-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <History className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{getTitle(item)}</p>
                {item.old_value && item.new_value && (
                  <p className="text-xs text-muted-foreground">
                    Changed from "{item.old_value}" to "{item.new_value}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
