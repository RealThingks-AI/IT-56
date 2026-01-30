import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ScrollText,
  Search,
  RefreshCw,
  Eye,
  Download,
  Undo2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PlusCircle,
  Trash2,
  AlertTriangle,
  UserPlus,
  LogIn,
  LogOut,
  Activity,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { SettingsLoadingSkeleton } from "./SettingsLoadingSkeleton";
import { AuditLogDetailsDialog } from "./AuditLogDetailsDialog";
import { AuditLogRevertDialog } from "./AuditLogRevertDialog";
import {
  ParsedAuditLog,
  ACTION_BADGE_CONFIG,
  MODULE_DISPLAY_NAMES,
  categorizeAction,
  parseMetadataChanges,
  canRevertLog,
  exportLogsToCSV,
  formatChangeValue,
} from "@/lib/auditLogUtils";
import { toast } from "sonner";

interface AuditLogRaw {
  id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string | null;
}

interface AuditLogFromDb {
  id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string | null;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <PlusCircle className="h-3.5 w-3.5" />,
  updated: <RefreshCw className="h-3.5 w-3.5" />,
  deleted: <Trash2 className="h-3.5 w-3.5" />,
  bulk_deleted: <AlertTriangle className="h-3.5 w-3.5" />,
  assigned: <UserPlus className="h-3.5 w-3.5" />,
  login: <LogIn className="h-3.5 w-3.5" />,
  logout: <LogOut className="h-3.5 w-3.5" />,
  other: <Activity className="h-3.5 w-3.5" />,
};

export function AdminLogs() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("7");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [showSessionActivity, setShowSessionActivity] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selectedLog, setSelectedLog] = useState<ParsedAuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());

  // Fetch total count separately
  const { data: totalCount } = useQuery({
    queryKey: ["admin-audit-logs-count", dateRange, actionFilter, moduleFilter, showSessionActivity],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", daysAgo.toISOString());

      if (actionFilter !== "all") {
        query = query.ilike("action_type", `%${actionFilter}%`);
      }

      if (moduleFilter !== "all") {
        query = query.eq("entity_type", moduleFilter);
      }

      if (!showSessionActivity) {
        query = query.not("action_type", "ilike", "%login%").not("action_type", "ilike", "%logout%");
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-audit-logs", dateRange, actionFilter, moduleFilter, showSessionActivity, page, perPage],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      let query = supabase
        .from("audit_logs")
        .select(`
          id,
          action_type,
          entity_type,
          entity_id,
          user_id,
          metadata,
          ip_address,
          user_agent,
          created_at
        `)
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (actionFilter !== "all") {
        query = query.ilike("action_type", `%${actionFilter}%`);
      }

      if (moduleFilter !== "all") {
        query = query.eq("entity_type", moduleFilter);
      }

      if (!showSessionActivity) {
        query = query.not("action_type", "ilike", "%login%").not("action_type", "ilike", "%logout%");
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user details for each log
      const userIds = [...new Set((data || []).map((log) => log.user_id).filter(Boolean))];
      let userMap: Record<string, { name: string | null; email: string }> = {};

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("auth_user_id, name, email")
          .in("auth_user_id", userIds);

        if (users) {
          userMap = users.reduce((acc, user) => {
            acc[user.auth_user_id] = { name: user.name, email: user.email };
            return acc;
          }, {} as Record<string, { name: string | null; email: string }>);
        }
      }

      // Parse logs into enhanced format
      const parsedLogs: ParsedAuditLog[] = (data || []).map((dbLog) => {
        const log: AuditLogRaw = {
          id: dbLog.id,
          action_type: dbLog.action_type,
          entity_type: dbLog.entity_type,
          entity_id: dbLog.entity_id,
          user_id: dbLog.user_id,
          metadata: dbLog.metadata as Record<string, unknown> | null,
          ip_address: dbLog.ip_address,
          user_agent: dbLog.user_agent,
          created_at: dbLog.created_at,
        };
        const user = log.user_id ? userMap[log.user_id] : null;
        const actionCategory = categorizeAction(log.action_type);
        const changes = parseMetadataChanges(log.metadata);

        return {
          id: log.id,
          actionType: log.action_type,
          actionCategory,
          entityType: log.entity_type,
          entityId: log.entity_id,
          entityName: (log.metadata?.name || log.metadata?.title || log.metadata?.record_name) as string | null,
          userId: log.user_id,
          userName: user?.name || null,
          userEmail: user?.email || null,
          changes,
          metadata: log.metadata,
          ipAddress: typeof log.ip_address === "string" ? log.ip_address : null,
          userAgent: log.user_agent,
          createdAt: log.created_at,
          canRevert: canRevertLog({ action_type: log.action_type, metadata: log.metadata }),
        };
      });

      return parsedLogs;
    },
  });

  const logs = data || [];

  // Client-side search filtering
  const filteredLogs = useMemo(() => {
    if (!search) return logs;
    const searchLower = search.toLowerCase();
    return logs.filter((log) =>
      log.actionType?.toLowerCase().includes(searchLower) ||
      log.entityType?.toLowerCase().includes(searchLower) ||
      log.entityName?.toLowerCase().includes(searchLower) ||
      log.userName?.toLowerCase().includes(searchLower) ||
      log.userEmail?.toLowerCase().includes(searchLower) ||
      log.entityId?.toLowerCase().includes(searchLower)
    );
  }, [logs, search]);

  const totalPages = Math.ceil((totalCount || 0) / perPage);
  const showingFrom = (page - 1) * perPage + 1;
  const showingTo = Math.min(page * perPage, totalCount || 0);

  const toggleExpandChanges = (logId: string) => {
    setExpandedChanges((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const handleViewDetails = (log: ParsedAuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleRevert = (log: ParsedAuditLog) => {
    setSelectedLog(log);
    setRevertOpen(true);
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      toast.error("No logs to export");
      return;
    }
    exportLogsToCSV(filteredLogs, "audit-logs");
    toast.success(`Exported ${filteredLogs.length} logs`);
  };

  const handlePerPageChange = (value: string) => {
    setPerPage(parseInt(value));
    setPage(1); // Reset to first page
  };

  const getBadgeConfig = (category: string) => {
    return ACTION_BADGE_CONFIG[category] || ACTION_BADGE_CONFIG.other;
  };

  if (isLoading) {
    return <SettingsLoadingSkeleton cards={1} rows={8} />;
  }

  return (
    <>
      <SettingsCard
        title="Activity & Audit Logs"
        description="View detailed activity logs and audit trail for your organization"
        icon={ScrollText}
        headerAction={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 Hours</SelectItem>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="helpdesk_tickets">Tickets</SelectItem>
                <SelectItem value="helpdesk_problems">Problems</SelectItem>
                <SelectItem value="itam_assets">Assets</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="user_tools">Tools</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                id="show-sessions"
                checked={showSessionActivity}
                onCheckedChange={setShowSessionActivity}
              />
              <Label htmlFor="show-sessions" className="text-sm">
                Show Session Activity
              </Label>
            </div>
          </div>

          {/* Pagination Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {(totalCount || 0) > 0 ? (
                <>
                  Showing {showingFrom}-{showingTo} of {(totalCount || 0).toLocaleString()} logs
                  {search && ` (${filteredLogs.length} filtered)`}
                </>
              ) : (
                "No logs found"
              )}
            </span>
            <Select value={String(perPage)} onValueChange={handlePerPageChange}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Timestamp</TableHead>
                  <TableHead className="w-[140px]">User</TableHead>
                  <TableHead className="w-[150px]">Action</TableHead>
                  <TableHead className="w-[180px]">Module / Record</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center gap-2">
                        <ScrollText className="h-8 w-8 text-muted-foreground/50" />
                        <p>No audit logs found</p>
                        <p className="text-xs">Try adjusting your filters or date range</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const badgeConfig = getBadgeConfig(log.actionCategory);
                    const isExpanded = expandedChanges.has(log.id);
                    const visibleChanges = isExpanded ? log.changes : log.changes.slice(0, 2);
                    const hasMoreChanges = log.changes.length > 2;

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {log.createdAt
                            ? format(new Date(log.createdAt), "MMM d, HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium truncate max-w-[120px]">
                              {log.userName || "System"}
                            </p>
                            {log.userEmail && (
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {log.userEmail}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${badgeConfig.className} border gap-1.5`}
                          >
                            {ACTION_ICONS[log.actionCategory]}
                            <span>{badgeConfig.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">
                              {MODULE_DISPLAY_NAMES[log.entityType || ""] || log.entityType || "—"}
                            </p>
                            {(log.entityName || log.entityId) && (
                              <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                {log.entityName || (log.entityId ? `#${log.entityId.slice(0, 8)}` : "")}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.changes.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="space-y-1">
                              {visibleChanges.map((change, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs">
                                  <span className="font-medium text-primary">{change.field}:</span>
                                  {change.oldValue !== null && (
                                    <>
                                      <span className="text-muted-foreground line-through">
                                        {formatChangeValue(change.oldValue)}
                                      </span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                    </>
                                  )}
                                  <span className="text-foreground">
                                    {formatChangeValue(change.newValue)}
                                  </span>
                                </div>
                              ))}
                              {hasMoreChanges && (
                                <button
                                  onClick={() => toggleExpandChanges(log.id)}
                                  className="text-xs text-primary hover:underline"
                                >
                                  {isExpanded
                                    ? "Show less"
                                    : `+${log.changes.length - 2} more`}
                                </button>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewDetails(log)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {log.canRevert && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                      onClick={() => handleRevert(log)}
                                    >
                                      <Undo2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Revert Changes</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Dialogs */}
      <AuditLogDetailsDialog
        log={selectedLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <AuditLogRevertDialog
        log={selectedLog}
        open={revertOpen}
        onOpenChange={setRevertOpen}
        onReverted={() => refetch()}
      />
    </>
  );
}
