import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Search, ClipboardList, LogIn, LogOut, Activity, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { FormattedDate } from "@/components/FormattedDate";
import { Link } from "react-router-dom";
import { sanitizeSearchInput } from "@/lib/utils";
import { StatCard } from "@/components/helpdesk/assets/StatCard";

const PAGE_SIZE = 50;

function getDateFilter(preset: string): string | null {
  if (preset === "all") return null;
  const d = new Date();
  if (preset === "today") d.setHours(0, 0, 0, 0);
  else if (preset === "7d") d.setDate(d.getDate() - 7);
  else if (preset === "30d") d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function formatAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AssetLogsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: usersMap, isLoading: usersLoading } = useQuery({
    queryKey: ["users-map-logs"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, auth_user_id, name, email");
      const map: Record<string, string> = {};
      data?.forEach((u) => {
        const displayName = u.name || u.email || u.id;
        map[u.id] = displayName;
        if (u.auth_user_id) map[u.auth_user_id] = displayName;
      });
      return map;
    },
  });

  const resolveUser = (id: string | null | undefined) => {
    if (!id) return "—";
    if (usersLoading || !usersMap) return "...";
    return usersMap[id] || "Unknown";
  };

  // Separate query for total stats (not affected by pagination)
  const { data: statCounts } = useQuery({
    queryKey: ["asset-log-stats"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [checkouts, checkins, changes] = await Promise.all([
        supabase.from("itam_asset_history").select("*", { count: "exact", head: true }).eq("action", "checked_out"),
        supabase.from("itam_asset_history").select("*", { count: "exact", head: true }).eq("action", "checked_in"),
        supabase.from("itam_asset_history").select("*", { count: "exact", head: true }).in("action", ["disposed", "reassigned", "returned_to_stock", "status_changed", "lost", "updated"]),
      ]);
      return {
        checkouts: checkouts.count || 0,
        checkins: checkins.count || 0,
        changes: changes.count || 0,
      };
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["asset-logs", search, actionFilter, datePreset, page],
    queryFn: async () => {
      let query = supabase
        .from("itam_asset_history")
        .select("*, itam_assets(id, name, asset_tag)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      const dateFrom = getDateFilter(datePreset);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (search) { const s = sanitizeSearchInput(search); query = query.or(`action.ilike.%${s}%,old_value.ilike.%${s}%,new_value.ilike.%${s}%`); }

      const { data: logs, count, error } = await query;
      if (error) throw error;
      return { logs: logs || [], total: count || 0 };
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} value={total} label="Total Logs" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={LogOut} value={statCounts?.checkouts ?? "—"} label="Check Outs" colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
        <StatCard icon={LogIn} value={statCounts?.checkins ?? "—"} label="Check Ins" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
        <StatCard icon={Activity} value={statCounts?.changes ?? "—"} label="Status Changes" colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
      </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-8" />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="checked_out">Check Out</SelectItem>
              <SelectItem value="checked_in">Check In</SelectItem>
              <SelectItem value="reassigned">Reassigned</SelectItem>
              <SelectItem value="returned_to_stock">Returned to Stock</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={datePreset} onValueChange={(v) => { setDatePreset(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Date</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Asset</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Action</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Old / New</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Loading logs...</p>
                  </div>
                </TableCell></TableRow>
              ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12">
                <div className="flex flex-col items-center justify-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No logs found</p>
                </div>
              </TableCell></TableRow>
              ) : logs.map((log: any) => (
                <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedLog(log)}>
                  <TableCell className="text-xs"><FormattedDate date={log.created_at} /></TableCell>
                  <TableCell>
                    {log.itam_assets ? (
                      <Link to={`/assets/detail/${log.itam_assets.asset_tag || log.itam_assets.id}`} className="text-primary hover:underline text-xs" onClick={(e) => e.stopPropagation()}>{log.itam_assets.asset_tag}</Link>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{formatAction(log.action)}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{log.old_value || log.new_value ? `${log.old_value || "-"} → ${log.new_value || "-"}` : "-"}</TableCell>
                  <TableCell className="text-xs">
                    {log.performed_by ? (
                      <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/employees?user=${log.performed_by}`); }}>{resolveUser(log.performed_by)}</span>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Showing {start}–{end} of {total}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <SheetContent>
            <SheetHeader><SheetTitle>Log Details</SheetTitle></SheetHeader>
            {selectedLog && (
              <div className="mt-4 space-y-3 text-sm">
                <div><span className="text-muted-foreground">Date:</span> <FormattedDate date={selectedLog.created_at} /></div>
                <div><span className="text-muted-foreground">Action:</span> <Badge variant="outline">{formatAction(selectedLog.action)}</Badge></div>
                <div><span className="text-muted-foreground">Asset:</span> {selectedLog.itam_assets?.asset_tag || "N/A"}</div>
                {selectedLog.old_value && <div><span className="text-muted-foreground">Old Value:</span> {selectedLog.old_value}</div>}
                {selectedLog.new_value && <div><span className="text-muted-foreground">New Value:</span> {selectedLog.new_value}</div>}
                <div><span className="text-muted-foreground">By:</span> {resolveUser(selectedLog.performed_by)}</div>
                {selectedLog.details && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Details:</span>
                    <div className="bg-muted rounded-md p-3 space-y-1">
                      {Object.entries(typeof selectedLog.details === 'string' ? JSON.parse(selectedLog.details) : selectedLog.details).map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-xs">
                          <span className="text-muted-foreground font-medium min-w-[100px]">{k}:</span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2 border-t">Log ID: {selectedLog.id}</div>
              </div>
            )}
          </SheetContent>
        </Sheet>
    </div>
  );
}