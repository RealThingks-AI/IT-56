import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  HardDrive,
  Download,
  RefreshCw,
  Loader2,
  Calendar,
  Trash2,
  Monitor,
  Ticket,
  RotateCcw,
  Database,
  Archive,
  Clock,
  FileArchive,
} from "lucide-react";
import { format } from "date-fns";
import { SettingsLoadingSkeleton } from "./SettingsLoadingSkeleton";

const MODULES = [
  { name: "Assets", tables: ["itam_assets"], icon: Monitor, filterCol: "is_active", filterVal: true },
  { name: "Tickets", tables: ["helpdesk_tickets"], icon: Ticket, filterCol: "is_deleted", filterVal: false },
];

const ALL_TABLES = MODULES.flatMap((m) => m.tables);

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return { value: `${h}:00:00`, label: `${h}:00` };
});

interface Backup {
  id: string;
  backup_name: string;
  file_path: string;
  file_size: number | null;
  backup_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  record_count: number | null;
  tables_included: string[] | null;
}

export function AdminBackup() {
  const queryClient = useQueryClient();
  const [backingUpModule, setBackingUpModule] = useState<string | null>(null);
  const [isFullBackup, setIsFullBackup] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<Backup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Backup | null>(null);

  const { data: backups = [], isLoading: backupsLoading } = useQuery({
    queryKey: ["system-backups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_backups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Backup[];
    },
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ["backup-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_schedules")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const { data: moduleCounts = {}, refetch: refetchCounts } = useQuery({
    queryKey: ["backup-module-counts"],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const mod of MODULES) {
        let total = 0;
        for (const table of mod.tables) {
          let query = (supabase as any).from(table).select("*", { count: "exact", head: true });
          if (mod.filterCol) {
            query = query.eq(mod.filterCol, mod.filterVal);
          }
          const { count, error } = await query;
          if (!error && count !== null) total += count;
        }
        counts[mod.name] = total;
      }
      return counts;
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data: existing } = await supabase
        .from("backup_schedules")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("backup_schedules")
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("backup_schedules")
          .insert({
            ...updates,
            next_backup_at: (updates as any).enabled
              ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
              : null,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-schedule"] });
      toast.success("Schedule updated");
    },
  });

  const triggerBackup = async (type: "full" | "module", moduleName?: string, tables?: string[]) => {
    if (type === "full") setIsFullBackup(true);
    else setBackingUpModule(moduleName || null);

    try {
      const { data, error } = await supabase.functions.invoke("create-backup", {
        body: {
          type,
          module_name: moduleName,
          tables: type === "full" ? ALL_TABLES : tables,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Backup completed — ${data.record_count} records`);
      queryClient.invalidateQueries({ queryKey: ["system-backups"] });
    } catch (err: any) {
      toast.error("Backup failed: " + err.message);
    } finally {
      setIsFullBackup(false);
      setBackingUpModule(null);
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const { data, error } = await supabase.storage
        .from("system-backups")
        .createSignedUrl(backup.file_path, 60);
      if (error || !data?.signedUrl) throw error || new Error("No URL");
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = `${backup.backup_name}.json`;
      a.click();
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDelete = async (backup: Backup) => {
    try {
      await supabase.storage.from("system-backups").remove([backup.file_path]);
      await supabase.from("system_backups").delete().eq("id", backup.id);
      queryClient.invalidateQueries({ queryKey: ["system-backups"] });
      toast.success("Backup deleted");
    } catch {
      toast.error("Delete failed");
    }
    setConfirmDelete(null);
  };

  const handleRestore = async (backup: Backup) => {
    try {
      toast.info("Restoring backup…");
      const { data, error } = await supabase.functions.invoke("restore-backup", {
        body: { backup_id: backup.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const totalRestored = Object.values(data.records_restored as Record<string, number>).reduce(
        (a, b) => a + b,
        0
      );
      toast.success(`Restore complete — ${totalRestored} records`);
    } catch (err: any) {
      toast.error("Restore failed: " + err.message);
    }
    setConfirmRestore(null);
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
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px]">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">In Progress</Badge>;
      case "failed":
        return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
    }
  };

  const totalActiveRecords = Object.values(moduleCounts).reduce((a, b) => a + b, 0);
  const lastBackup = backups.find((b) => b.status === "completed");

  const getLastModuleBackup = (moduleName: string) => {
    return backups.find(
      (b) => b.status === "completed" && b.backup_name?.toLowerCase().startsWith(moduleName.toLowerCase())
    );
  };

  if (backupsLoading || scheduleLoading) {
    return <SettingsLoadingSkeleton cards={2} rows={4} />;
  }

  return (
    <div className="space-y-4">
      {/* Top row: Full Backup + Schedule side by side */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Full System Backup */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Full System Backup</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Archive className="h-3 w-3" />
              {totalActiveRecords} records
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              {MODULES.length} modules
            </span>
            {lastBackup && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last: {format(new Date(lastBackup.created_at), "MMM d, HH:mm")}
              </span>
            )}
          </div>
          <Button size="sm" onClick={() => triggerBackup("full")} disabled={isFullBackup || !!backingUpModule} className="w-full">
            {isFullBackup ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5 mr-1.5" />}
            Backup Now
          </Button>
        </div>

        {/* Scheduled Backups */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Scheduled Backups</h3>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Enable Auto-Backup</Label>
            <Switch
              checked={schedule?.enabled || false}
              onCheckedChange={(checked) => updateSchedule.mutate({ enabled: checked })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Time</Label>
            <Select
              value={schedule?.backup_time || "02:00:00"}
              onValueChange={(val) => updateSchedule.mutate({ backup_time: val })}
              disabled={!schedule?.enabled}
            >
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="text-xs whitespace-nowrap">Every</Label>
            <Select
              value={String(schedule?.frequency_days || 3)}
              onValueChange={(val) => updateSchedule.mutate({ frequency_days: parseInt(val) })}
              disabled={!schedule?.enabled}
            >
              <SelectTrigger className="w-[90px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} day{d > 1 ? "s" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {schedule?.next_backup_at && schedule?.enabled && (
            <p className="text-[10px] text-muted-foreground">
              Next: {format(new Date(schedule.next_backup_at), "MMM d, yyyy HH:mm")}
            </p>
          )}
        </div>
      </div>

      {/* Module Backup — flat cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Module Backup</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => refetchCounts()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const isLoading = backingUpModule === mod.name;
            const lastModBackup = getLastModuleBackup(mod.name);
            return (
              <div key={mod.name} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{mod.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {moduleCounts[mod.name] ?? "—"} records
                    {lastModBackup && ` · Last: ${format(new Date(lastModBackup.created_at), "MMM d, HH:mm")}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => triggerBackup("module", mod.name, mod.tables)}
                  disabled={isLoading || isFullBackup || (!!backingUpModule && backingUpModule !== mod.name)}
                >
                  {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <HardDrive className="h-3 w-3" />}
                  <span className="ml-1">Backup</span>
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Backup History — flat table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Backup History</h3>
          <Badge variant="outline" className="text-[10px]">{backups.length} / 30</Badge>
        </div>
        {backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border">
            <FileArchive className="h-6 w-6 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">No backups yet</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Records</TableHead>
                  <TableHead className="text-xs">Size</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id} className="h-9">
                    <TableCell className="py-1">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {b.backup_name?.startsWith("full-") ? "Full" : b.backup_name?.split("-backup-")[0] || b.backup_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-1">
                      {format(new Date(b.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-xs py-1">{b.record_count ?? "—"}</TableCell>
                    <TableCell className="text-xs py-1">{formatFileSize(b.file_size)}</TableCell>
                    <TableCell className="py-1">{getStatusBadge(b.status)}</TableCell>
                    <TableCell className="py-1">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(b)} disabled={b.status !== "completed"} title="Download">
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setConfirmRestore(b)} disabled={b.status !== "completed"} title="Restore">
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(b)} title="Delete">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Restore Confirm */}
      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite existing data with the backup contents. This action cannot be undone. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRestore && handleRestore(confirmRestore)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this backup file. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
