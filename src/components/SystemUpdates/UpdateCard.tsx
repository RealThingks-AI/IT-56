import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  XCircle,
  PlayCircle,
  Calendar,
  Info
} from "lucide-react";

export interface SystemUpdate {
  id: string;
  title: string;
  description: string;
  category: 'windows' | 'server' | 'critical' | 'security' | 'firmware' | 'application';
  status: 'pending' | 'installing' | 'installed' | 'failed' | 'scheduled';
  version?: string;
  date: string;
  progress?: number;
  size?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface UpdateCardProps {
  update: SystemUpdate;
  onInstall?: (id: string) => void;
  onSchedule?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export function UpdateCard({ update, onInstall, onSchedule, onViewDetails }: UpdateCardProps) {
  const getCategoryIcon = () => {
    const iconClass = "h-5 w-5";
    switch (update.category) {
      case 'windows':
        return <Download className={iconClass} />;
      case 'server':
        return <PlayCircle className={iconClass} />;
      case 'critical':
        return <AlertCircle className={iconClass} />;
      case 'security':
        return <Info className={iconClass} />;
      case 'firmware':
        return <Clock className={iconClass} />;
      case 'application':
        return <CheckCircle2 className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const getCategoryColor = () => {
    switch (update.category) {
      case 'windows':
        return 'bg-primary/10 text-primary';
      case 'server':
        return 'bg-accent/10 text-accent-foreground';
      case 'critical':
        return 'bg-destructive/10 text-destructive';
      case 'security':
        return 'bg-warning/10 text-warning';
      case 'firmware':
        return 'bg-muted/10 text-muted-foreground';
      case 'application':
        return 'bg-success/10 text-success';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20' },
      installing: { label: 'Installing', className: 'bg-primary/10 text-primary border-primary/20' },
      installed: { label: 'Installed', className: 'bg-success/10 text-success border-success/20' },
      failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
      scheduled: { label: 'Scheduled', className: 'bg-accent/10 text-accent-foreground border-accent/20' },
    };

    const config = statusConfig[update.status];
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const getSeverityBadge = () => {
    if (!update.severity) return null;
    
    const severityConfig = {
      low: { label: 'Low', className: 'bg-success/10 text-success border-success/20' },
      medium: { label: 'Medium', className: 'bg-warning/10 text-warning border-warning/20' },
      high: { label: 'High', className: 'bg-destructive/10 text-destructive border-destructive/20' },
      critical: { label: 'Critical', className: 'bg-destructive text-destructive-foreground' },
    };

    const config = severityConfig[update.severity];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-3 rounded-lg ${getCategoryColor()}`}>
              {getCategoryIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-foreground">{update.title}</h3>
                {update.version && (
                  <Badge variant="outline" className="text-xs">{update.version}</Badge>
                )}
                {getStatusBadge()}
                {getSeverityBadge()}
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">{update.description}</p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {update.date}
                </span>
                {update.size && (
                  <span>{update.size}</span>
                )}
                <span className="capitalize">{update.category}</span>
              </div>

              {update.status === 'installing' && update.progress !== undefined && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Installing...</span>
                    <span>{update.progress}%</span>
                  </div>
                  <Progress value={update.progress} className="h-2" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {update.status === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => onInstall?.(update.id)}
                  className="whitespace-nowrap"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Install
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onSchedule?.(update.id)}
                  className="whitespace-nowrap"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Schedule
                </Button>
              </>
            )}
            
            {update.status === 'failed' && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => onInstall?.(update.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}

            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onViewDetails?.(update.id)}
            >
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
