import { Button } from "@/components/ui/button";
import { FileBarChart, Megaphone, Plus, Calendar, Users } from "lucide-react";

export function AdminReports() {
  return (
    <div className="space-y-4">
      {/* Scheduled Reports */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Scheduled Reports</h3>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Schedule
          </Button>
        </div>
        <div className="rounded-lg border bg-card flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="h-6 w-6 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">No scheduled reports yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
            Configure automated reports sent to stakeholders on a schedule.
          </p>
        </div>
      </div>

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Announcements</h3>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs" disabled>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Announcement
          </Button>
        </div>
        <div className="rounded-lg border bg-card flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-6 w-6 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">No announcements yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
            Notify your team about system updates, maintenance windows, or important info.
          </p>
        </div>
      </div>
    </div>
  );
}
