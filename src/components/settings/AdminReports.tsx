import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { FileBarChart, Megaphone, Plus, Calendar, Users } from "lucide-react";

export function AdminReports() {
  return (
    <div className="space-y-6">
      {/* Scheduled Reports */}
      <SettingsCard
        title="Scheduled Reports"
        description="Configure automated reports to be sent to stakeholders"
        icon={FileBarChart}
        headerAction={
          <Button size="sm" disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Report Schedule
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="text-lg font-medium mb-1">No scheduled reports yet</h4>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create scheduled reports to automatically send performance summaries,
            SLA reports, and other analytics to your team.
          </p>
        </div>
      </SettingsCard>

      {/* Announcements */}
      <SettingsCard
        title="Announcement Management"
        description="Create and manage system-wide announcements for your users"
        icon={Megaphone}
        headerAction={
          <Button size="sm" disabled>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="text-lg font-medium mb-1">No announcements yet</h4>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create announcements to notify your team about system updates,
            maintenance windows, or important information.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
