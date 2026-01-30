import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertCircle, XCircle, CheckCircle2, Clock, ExternalLink } from "lucide-react";

export interface ServiceHealth {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  uptime: number;
  responseTime?: number;
  lastChecked: string;
  description?: string;
  url?: string;
  incidents?: number;
}

interface ServiceHealthCardProps {
  service: ServiceHealth;
  onViewDetails?: (id: string) => void;
  onViewIncidents?: (id: string) => void;
}

export function ServiceHealthCard({ service, onViewDetails, onViewIncidents }: ServiceHealthCardProps) {
  const getStatusIcon = () => {
    switch (service.status) {
      case 'operational':
        return <Activity className="h-5 w-5 text-success" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'partial_outage':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'major_outage':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'maintenance':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusBadge = () => {
    const config = {
      operational: { label: 'Operational', className: 'bg-success/10 text-success border-success/20' },
      degraded: { label: 'Degraded Performance', className: 'bg-warning/10 text-warning border-warning/20' },
      partial_outage: { label: 'Partial Outage', className: 'bg-destructive/10 text-destructive border-destructive/20' },
      major_outage: { label: 'Major Outage', className: 'bg-destructive text-destructive-foreground' },
      maintenance: { label: 'Maintenance', className: 'bg-muted/10 text-muted-foreground border-muted/20' },
    };

    const statusConfig = config[service.status];
    return <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div>{getStatusIcon()}</div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{service.name}</h3>
                {getStatusBadge()}
                {service.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => window.open(service.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {service.description && (
                <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  {service.uptime}% uptime
                </span>
                {service.responseTime && (
                  <span>{service.responseTime}ms avg response</span>
                )}
                <span>Last checked: {new Date(service.lastChecked).toLocaleTimeString()}</span>
                {service.incidents !== undefined && service.incidents > 0 && (
                  <Badge variant="destructive" className="h-5">
                    {service.incidents} incident{service.incidents > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {service.incidents !== undefined && service.incidents > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewIncidents?.(service.id)}
              >
                View Incidents
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails?.(service.id)}
            >
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
