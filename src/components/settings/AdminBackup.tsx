import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganisation } from "@/contexts/OrganisationContext";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { HardDrive, Download, RefreshCw, Loader2, Calendar, Settings2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { SettingsLoadingSkeleton } from "./SettingsLoadingSkeleton";

interface Backup {
  id: string;
  backup_name: string;
  file_path: string;
  file_size: number | null;
  backup_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface BackupSchedule {
  id: string;
  enabled: boolean;
  frequency_days: number;
  retention_count: number;
  last_backup_at: string | null;
  next_backup_at: string | null;
}

export function AdminBackup() {
  const { organisation } = useOrganisation();
  const queryClient = useQueryClient();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const { data: backups = [], isLoading: backupsLoading } = useQuery({
    queryKey: ["system-backups", organisation?.id],
    queryFn: async () => {
      if (!organisation?.id) return [];
      const { data, error } = await supabase
        .from("system_backups")
        .select("*")
        .eq("organisation_id", organisation.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Backup[];
    },
    enabled: !!organisation?.id,
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ["backup-schedule", organisation?.id],
    queryFn: async () => {
      if (!organisation?.id) return null;
      const { data, error } = await supabase
        .from("backup_schedules")
        .select("*")
        .eq("organisation_id", organisation.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as BackupSchedule | null;
    },
    enabled: !!organisation?.id,
  });

  const updateSchedule = useMutation({
    mutationFn: async (updates: Partial<BackupSchedule>) => {
      if (!organisation?.id) throw new Error("No organization");
      
      const { data: existing } = await supabase
        .from("backup_schedules")
        .select("id")
        .eq("organisation_id", organisation.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("backup_schedules")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("organisation_id", organisation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("backup_schedules")
          .insert({
            organisation_id: organisation.id,
            ...updates,
            next_backup_at: updates.enabled 
              ? new Date(Date.now() + (updates.frequency_days || 3) * 24 * 60 * 60 * 1000).toISOString()
              : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-schedule"] });
      toast.success("Backup schedule updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update schedule: " + error.message);
    },
  });

  const createManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Create a backup record
      const backupName = `backup-${format(new Date(), "yyyy-MM-dd-HHmmss")}`;
      const { error } = await supabase
        .from("system_backups")
        .insert({
          organisation_id: organisation?.id,
          backup_name: backupName,
          file_path: `${organisation?.id}/${backupName}.json`,
          backup_type: "manual",
          status: "pending",
          tables_included: ["users", "helpdesk_tickets", "itam_assets", "helpdesk_categories"],
        });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["system-backups"] });
      toast.success("Backup initiated. This may take a few minutes.");
    } catch (error: any) {
      toast.error("Failed to create backup: " + error.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">In Progress</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (backupsLoading || scheduleLoading) {
    return <SettingsLoadingSkeleton cards={2} rows={4} />;
  }

  return (
    <div className="space-y-6">
      {/* Schedule Settings */}
      <SettingsCard
        title="Automatic Backup Schedule"
        description="Configure automated backups to run every 3 days, keeping the last 20 backups"
        icon={Calendar}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">Enable Automatic Backups</Label>
              <p className="text-xs text-muted-foreground">
                Backups will run automatically based on schedule
              </p>
            </div>
            <Switch
              checked={schedule?.enabled || false}
              onCheckedChange={(checked) => updateSchedule.mutate({ enabled: checked })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequency (days)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={schedule?.frequency_days || 3}
                onChange={(e) => updateSchedule.mutate({ frequency_days: parseInt(e.target.value) || 3 })}
                disabled={!schedule?.enabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Retention Count</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={schedule?.retention_count || 20}
                onChange={(e) => updateSchedule.mutate({ retention_count: parseInt(e.target.value) || 20 })}
                disabled={!schedule?.enabled}
              />
            </div>
          </div>

          {schedule?.enabled && (
            <div className="flex gap-4 text-sm text-muted-foreground pt-2">
              <span>Last backup: {schedule.last_backup_at ? format(new Date(schedule.last_backup_at), "MMM d, yyyy HH:mm") : "Never"}</span>
              <span>Next backup: {schedule.next_backup_at ? format(new Date(schedule.next_backup_at), "MMM d, yyyy HH:mm") : "Not scheduled"}</span>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Backup List */}
      <SettingsCard
        title="Backup History"
        description="View and manage your database backups"
        icon={HardDrive}
        headerAction={
          <Button onClick={createManualBackup} disabled={isCreatingBackup}>
            {isCreatingBackup ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Create Backup
          </Button>
        }
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No backups yet. Create your first backup to get started.
                  </TableCell>
                </TableRow>
              ) : (
                backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">{backup.backup_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {backup.backup_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(backup.file_size)}</TableCell>
                    <TableCell>{getStatusBadge(backup.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(backup.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SettingsCard>
    </div>
  );
}
