import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";

interface SLAStatusBannerProps {
  slaDueDate?: string | null;
  slaBreached?: boolean;
  status: string;
  createdAt: string;
}

export const SLAStatusBanner = ({ 
  slaDueDate, 
  slaBreached, 
  status, 
  createdAt 
}: SLAStatusBannerProps) => {
  if (!slaDueDate) return null;
  
  const isResolved = ['resolved', 'closed'].includes(status);
  const dueDate = new Date(slaDueDate);
  const now = new Date();
  const created = new Date(createdAt);
  
  const isBreached = slaBreached || (dueDate < now && !isResolved);
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isWarning = !isBreached && hoursUntilDue < 2 && !isResolved;
  
  // Calculate progress
  const totalMinutes = differenceInMinutes(dueDate, created);
  const elapsedMinutes = differenceInMinutes(now, created);
  const progress = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));
  
  if (isResolved) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-700 dark:text-green-400">
          Ticket resolved
        </span>
      </div>
    );
  }
  
  if (isBreached) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <div>
            <span className="text-sm font-medium text-destructive">SLA Breached</span>
            <span className="text-sm text-muted-foreground ml-2">
              Was due {formatDistanceToNow(dueDate, { addSuffix: true })}
            </span>
          </div>
        </div>
        <Badge variant="destructive" className="shrink-0">Breached</Badge>
      </div>
    );
  }
  
  if (isWarning) {
    return (
      <div className="space-y-2 px-4 py-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-orange-500" />
            <div>
              <span className="text-sm font-medium text-orange-700 dark:text-orange-400">SLA Due Soon</span>
              <span className="text-sm text-muted-foreground ml-2">
                Due {formatDistanceToNow(dueDate, { addSuffix: true })}
              </span>
            </div>
          </div>
          <Badge variant="outline" className="border-orange-300 text-orange-700 shrink-0">Warning</Badge>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    );
  }
  
  // Normal SLA status
  return (
    <div className="space-y-2 px-4 py-2 bg-muted/50 border rounded-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <span className="text-sm font-medium">SLA Target</span>
            <span className="text-sm text-muted-foreground ml-2">
              Due {formatDistanceToNow(dueDate, { addSuffix: true })}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">On Track</Badge>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
};
