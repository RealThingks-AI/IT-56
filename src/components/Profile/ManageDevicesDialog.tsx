import { useEffect, useState } from "react";
import { Smartphone, Monitor, Tablet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ManageDevicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SessionInfo {
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}

export const ManageDevicesDialog = ({
  open,
  onOpenChange,
}: ManageDevicesDialogProps) => {
  const { user } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchSessionInfo();
    }
  }, [open, user]);

  const fetchSessionInfo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      setSessionInfo({
        userAgent: navigator.userAgent,
        createdAt: new Date(session.user.created_at).toISOString(),
        expiresAt: new Date(session.expires_at! * 1000).toISOString(),
      });
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone className="h-5 w-5" />;
    } else if (ua.includes("tablet") || ua.includes("ipad")) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getDeviceType = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "Mobile";
    if (ua.includes("tablet") || ua.includes("ipad")) return "Tablet";
    return "Desktop";
  };

  const getBrowserInfo = (userAgent: string) => {
    // Extract browser name
    let browser = "Unknown";
    if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Chrome";
    else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    else if (userAgent.includes("Edg")) browser = "Edge";
    else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";

    // Extract OS
    let os = "Unknown";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac")) os = "macOS";
    else if (userAgent.includes("Linux")) os = "Linux";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";

    return `${browser} on ${os}`;
  };

  if (!sessionInfo) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Your Devices</DialogTitle>
          <DialogDescription>
            Manage the devices where you're currently signed in
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {/* Current device */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getDeviceIcon(sessionInfo.userAgent)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{getDeviceType(sessionInfo.userAgent)}</p>
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getBrowserInfo(sessionInfo.userAgent)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Signed in: {formatDistanceToNow(new Date(sessionInfo.createdAt), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last active: Just now
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              For security, sign out of any sessions you don't recognize. You can sign out of all other devices by changing your password.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
