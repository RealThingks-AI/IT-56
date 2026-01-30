import { formatDistanceToNow, format } from "date-fns";
import { 
  MessageSquare, 
  History, 
  Paperclip, 
  UserPlus, 
  Tag, 
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getUserDisplayName, getUserInitials } from "@/lib/userUtils";

interface ActivityItem {
  id: string | number;
  type: "comment" | "history" | "attachment";
  timestamp: string;
  user?: { name?: string; email?: string } | null;
  data: any;
}

interface ActivityTimelineProps {
  comments: any[];
  history: any[];
  attachments: any[];
  maxHeight?: string;
}

export const ActivityTimeline = ({
  comments = [],
  history = [],
  attachments = [],
  maxHeight = "500px",
}: ActivityTimelineProps) => {
  // Combine all activities into a single timeline
  const activities: ActivityItem[] = [
    ...comments.map((c) => ({
      id: `comment-${c.id}`,
      type: "comment" as const,
      timestamp: c.created_at,
      user: c.user,
      data: c,
    })),
    ...history.map((h) => ({
      id: `history-${h.id}`,
      type: "history" as const,
      timestamp: h.timestamp || h.created_at,
      user: h.user,
      data: h,
    })),
    ...attachments.map((a) => ({
      id: `attachment-${a.id}`,
      type: "attachment" as const,
      timestamp: a.uploaded_at || a.created_at,
      user: a.uploaded_by_user,
      data: a,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getHistoryIcon = (fieldName: string) => {
    switch (fieldName) {
      case "status":
        return <CheckCircle className="h-4 w-4" />;
      case "priority":
        return <AlertCircle className="h-4 w-4" />;
      case "assignee_id":
        return <UserPlus className="h-4 w-4" />;
      case "category_id":
        return <Tag className="h-4 w-4" />;
      default:
        return <Edit className="h-4 w-4" />;
    }
  };

  const getHistoryDescription = (item: any) => {
    const { field_name, old_value, new_value } = item;
    switch (field_name) {
      case "status":
        return (
          <span>
            changed status from{" "}
            <Badge variant="outline" className="text-xs mx-1">
              {old_value || "none"}
            </Badge>
            to
            <Badge variant="outline" className="text-xs mx-1">
              {new_value}
            </Badge>
          </span>
        );
      case "priority":
        return (
          <span>
            changed priority from{" "}
            <Badge variant="outline" className="text-xs mx-1">
              {old_value || "none"}
            </Badge>
            to
            <Badge variant="outline" className="text-xs mx-1">
              {new_value}
            </Badge>
          </span>
        );
      case "assignee_id":
        return <span>assigned the ticket to {new_value || "someone"}</span>;
      default:
        return (
          <span>
            updated <strong>{field_name.replace(/_/g, " ")}</strong>
          </span>
        );
    }
  };

  const getInitials = (user?: { name?: string; email?: string } | null) => {
    return getUserInitials(user);
  };

  const renderActivity = (activity: ActivityItem) => {
    const { type, data, user, timestamp } = activity;

    return (
      <div key={activity.id} className="flex gap-3 py-3">
        <div className="flex flex-col items-center">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="w-px flex-1 bg-border mt-2" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {getUserDisplayName(user) || "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
            </span>
          </div>

          {type === "comment" && (
            <div className={cn(
              "rounded-lg p-3 text-sm",
              data.is_internal 
                ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900" 
                : "bg-muted"
            )}>
              {data.is_internal && (
                <div className="flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-400 mb-2">
                  <Lock className="h-3 w-3" />
                  Internal note
                </div>
              )}
              <p className="whitespace-pre-wrap">{data.comment}</p>
            </div>
          )}

          {type === "history" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getHistoryIcon(data.field_name)}
              {getHistoryDescription(data)}
            </div>
          )}

          {type === "attachment" && (
            <div className="flex items-center gap-2 text-sm">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <a
                href={data.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {data.file_name}
              </a>
              <span className="text-xs text-muted-foreground">
                ({Math.round((data.file_size || 0) / 1024)} KB)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }} className="pr-4">
      <div className="space-y-0">
        {activities.map(renderActivity)}
      </div>
    </ScrollArea>
  );
};
