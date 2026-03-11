import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useITTaskActivity } from "@/hooks/it-tasks/useITTasks";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Activity } from "lucide-react";

const actionColor: Record<string, string> = {
  created: "default",
  updated: "secondary",
  status_changed: "outline",
  deleted: "destructive",
  comment_added: "default",
  internal_note: "secondary",
  attachment_added: "outline",
  attachment_deleted: "destructive",
};

const PAGE_SIZE = 50;

export default function ITTasksActivity() {
  const { data: activity = [], isLoading } = useITTaskActivity();
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = activity.slice(0, visibleCount);
  const hasMore = visibleCount < activity.length;

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <Card>
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>}
          {!isLoading && activity.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
          )}
          <div className="space-y-1">
            {visible.map(a => (
              <div
                key={a.id}
                className={`flex items-center gap-3 py-2 border-b last:border-0 ${a.task_id ? "cursor-pointer hover:bg-muted/50 rounded-md transition-colors" : ""}`}
                onClick={() => a.task_id && navigate(`/it-tasks/${a.task_id}`)}
              >
                <div className="flex flex-col items-center shrink-0 w-16">
                  <span className="text-[10px] text-muted-foreground">{format(new Date(a.created_at), "MMM d")}</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(a.created_at), "HH:mm")}</span>
                </div>
                <Badge variant={actionColor[a.action] as any || "outline"} className="text-[10px] shrink-0 w-[90px] justify-center">
                  {a.action.replace(/_/g, " ")}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{a.task_title}</p>
                  {a.detail && <p className="text-[11px] text-muted-foreground truncate">{a.detail}</p>}
                </div>
                {a.user_name && <span className="text-[11px] text-muted-foreground shrink-0">{a.user_name}</span>}
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="text-center pt-3">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                Show more ({activity.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
