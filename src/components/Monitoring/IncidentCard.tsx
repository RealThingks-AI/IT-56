import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, User } from "lucide-react";

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  affectedServices: string[];
  startTime: string;
  resolvedTime?: string;
  assignedTo?: string;
}

interface IncidentCardProps {
  incident: Incident;
  onViewDetails?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export function IncidentCard({ incident, onViewDetails, onResolve }: IncidentCardProps) {
  const getSeverityBadge = () => {
    const config = {
      low: { label: 'Low', className: 'bg-success/10 text-success border-success/20' },
      medium: { label: 'Medium', className: 'bg-warning/10 text-warning border-warning/20' },
      high: { label: 'High', className: 'bg-destructive/10 text-destructive border-destructive/20' },
      critical: { label: 'Critical', className: 'bg-destructive text-destructive-foreground' },
    };

    const severityConfig = config[incident.severity];
    return <Badge className={severityConfig.className}>{severityConfig.label}</Badge>;
  };

  const getStatusBadge = () => {
    const config = {
      investigating: { label: 'Investigating', className: 'bg-warning/10 text-warning border-warning/20' },
      identified: { label: 'Identified', className: 'bg-primary/10 text-primary border-primary/20' },
      monitoring: { label: 'Monitoring', className: 'bg-accent/10 text-accent-foreground border-accent/20' },
      resolved: { label: 'Resolved', className: 'bg-success/10 text-success border-success/20' },
    };

    const statusConfig = config[incident.status];
    return <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>;
  };

  const getDuration = () => {
    const start = new Date(incident.startTime);
    const end = incident.resolvedTime ? new Date(incident.resolvedTime) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className={`h-5 w-5 ${incident.status === 'resolved' ? 'text-success' : 'text-destructive'}`} />
                <h3 className="font-semibold text-foreground">{incident.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{incident.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {getSeverityBadge()}
              {getStatusBadge()}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Duration: {getDuration()}
            </span>
            {incident.assignedTo && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {incident.assignedTo}
              </span>
            )}
          </div>

          {incident.affectedServices.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Affected:</span>
              {incident.affectedServices.map((service, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {service}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails?.(incident.id)}
            >
              View Details
            </Button>
            {incident.status !== 'resolved' && (
              <Button
                size="sm"
                onClick={() => onResolve?.(incident.id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Resolved
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
