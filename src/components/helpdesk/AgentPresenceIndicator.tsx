import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Edit2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentPresenceIndicatorProps {
  ticketId: number;
}

interface PresenceState {
  userId: string;
  userName: string;
  userEmail: string;
  action: "viewing" | "editing";
  lastActive: string;
}

export const AgentPresenceIndicator = ({ ticketId }: AgentPresenceIndicatorProps) => {
  const [presence, setPresence] = useState<PresenceState[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user-presence"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("auth_user_id", user.id)
        .single();

      return data;
    },
  });

  useEffect(() => {
    if (!currentUser) return;

    setCurrentUserId(currentUser.id);

    // Create a unique channel for this ticket
    const channel = supabase.channel(`ticket-presence-${ticketId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const presenceList: PresenceState[] = [];

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.userId !== currentUser.id) {
              presenceList.push({
                userId: p.userId,
                userName: p.userName,
                userEmail: p.userEmail,
                action: p.action,
                lastActive: p.lastActive,
              });
            }
          });
        });

        setPresence(presenceList);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        // Handle join
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        // Handle leave
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUser.id,
            userName: currentUser.name || currentUser.email,
            userEmail: currentUser.email,
            action: "viewing",
            lastActive: new Date().toISOString(),
          });
        }
      });

    // Update presence every 30 seconds
    const interval = setInterval(() => {
      channel.track({
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userEmail: currentUser.email,
        action: "viewing",
        lastActive: new Date().toISOString(),
      });
    }, 30000);

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [ticketId, currentUser]);

  if (presence.length === 0) return null;

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.[0]?.toUpperCase() || "?";
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {presence.slice(0, 3).map((p) => (
            <Tooltip key={p.userId}>
              <TooltipTrigger>
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                    {getInitials(p.userName, p.userEmail)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  {p.action === "editing" ? (
                    <Edit2 className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {p.userName || p.userEmail} is {p.action}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {presence.length > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{presence.length - 3} more
          </Badge>
        )}
        <Badge variant="outline" className="text-xs gap-1">
          <Eye className="h-3 w-3" />
          {presence.length} viewing
        </Badge>
      </div>
    </TooltipProvider>
  );
};
