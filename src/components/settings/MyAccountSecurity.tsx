import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Key, Monitor, Smartphone, RefreshCw, LogOut } from "lucide-react";
import { ChangePasswordDialog } from "@/components/Profile/ChangePasswordDialog";
import { format } from "date-fns";

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
}

export function MyAccountSecurity() {
  const { user } = useAuth();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock sessions for display - would be replaced with actual session data
  const sessions: Session[] = [
    {
      id: "1",
      device: "Desktop",
      browser: "Chrome on Windows",
      location: "Current session",
      lastActive: new Date(),
      isCurrent: true,
    },
  ];

  const handleRefreshSessions = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes("mobile") || device.toLowerCase().includes("phone")) {
      return Smartphone;
    }
    return Monitor;
  };

  return (
    <div className="space-y-6">
      {/* Password Section */}
      <SettingsCard
        title="Password"
        description="Manage your password and authentication settings"
        icon={Key}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                Last changed: Unknown
              </p>
            </div>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
              Change Password
            </Button>
          </div>
        </div>
      </SettingsCard>

      {/* Active Sessions */}
      <SettingsCard
        title="Active Sessions"
        description="Manage devices where you're currently signed in"
        icon={Shield}
        headerAction={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshSessions}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" disabled>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out Others
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.device);
            return (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                    <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{session.browser}</p>
                      {session.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          This Device
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.location} • {format(session.lastActive, "PPp")}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button variant="ghost" size="sm">
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SettingsCard>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </div>
  );
}
