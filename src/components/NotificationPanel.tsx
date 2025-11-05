import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { ScrollArea } from "@/components/ui/scroll-area";
export function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  return <Popover>
      <PopoverTrigger asChild>
        
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              <p>No notifications</p>
            </div> : <div className="space-y-2">
              {notifications.map(notification => <div key={notification.id} className={`p-3 rounded-lg border cursor-pointer hover:bg-accent ${!notification.read ? "bg-accent/50" : ""}`} onClick={() => markAsRead(notification.id)}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium">{notification.title}</span>
                    {!notification.read && <span className="h-2 w-2 bg-primary rounded-full" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.timestamp.toLocaleString()}
                  </p>
                </div>)}
            </div>}
        </ScrollArea>
      </PopoverContent>
    </Popover>;
}