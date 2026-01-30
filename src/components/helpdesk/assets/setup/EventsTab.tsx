import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Construction } from "lucide-react";

export function EventsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Events Configuration
        </CardTitle>
        <CardDescription className="text-xs">
          Define custom event types for asset tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Event types configuration will allow you to define custom events like
            "Inspection", "Calibration", "Service Due" and track them against your assets.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
