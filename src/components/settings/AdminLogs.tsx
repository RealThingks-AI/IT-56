import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  KeyRound,
  Filter,
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
  
  resolveUUIDsFromLogs,
  extractUserFromMetadata,
  summarizeLogChanges,
  isLoginNoiseLog,
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

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <PlusCircle className="h-3 w-3" />,
  updated: <RefreshCw className="h-3 w-3" />,
  deleted: <Trash2 className="h-3 w-3" />,
  bulk_deleted: <AlertTriangle className="h-3 w-3" />,
  assigned: <UserPlus className="h-3 w-3" />,
  login: <LogIn className="h-3 w-3" />,
  logout: <LogOut className="h-3 w-3" />,
  password_reset: <KeyRound className="h-3 w-3" />,
  other: <Activity className="h-3 w-3" />,
};

export function AdminLogs() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [showSessionActivity, setShowSessionActivity] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [selectedLog, setSelectedLog] = useState<ParsedAuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [uuidNameMap, setUuidNameMap] = useState<Map<string, string>>(new Map());

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, dateRange, actionFilter, moduleFilter, showSessionActivity]);

  // Fetch total count
  const { data: totalCount } = useQuery({
    queryKey: ["admin-audit-logs-count", dateRange, actionFilter, moduleFilter, showSessionActivity],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact", head: true });

      if (dateRange !== "all") {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
        query = query.gte("created_at", daysAgo.toISOString());
      }

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
        .order("created_at", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (dateRange !== "all") {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
        query = query.gte("created_at", daysAgo.toISOString());
      }

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

      // Fetch user details
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
        
        // Detect login noise and reclassify
        const isLoginNoise = isLoginNoiseLog({
          action_type: log.action_type,
          entity_type: log.entity_type,
          metadata: log.metadata,
        });
        const actionCategory = isLoginNoise ? "login" : categorizeAction(log.action_type);
        const changes = parseMetadataChanges(log.metadata);

        // Extract user from metadata if user_id didn't resolve
        const metaUser = !user
          ? extractUserFromMetadata(log.metadata, log.entity_type)
          : null;

        return {
          id: log.id,
          actionType: isLoginNoise ? "User Login" : log.action_type,
          actionCategory,
          entityType: log.entity_type,
          entityId: log.entity_id,
          entityName: (log.metadata?.name || log.metadata?.title || log.metadata?.record_name || log.metadata?.target_email) as string | null,
          userId: log.user_id,
          userName: user?.name || metaUser?.name || null,
          userEmail: user?.email || metaUser?.email || null,
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

  // Resolve UUIDs after data loads
  useEffect(() => {
    if (data && data.length > 0) {
      resolveUUIDsFromLogs(data).then(setUuidNameMap);
    }
  }, [data]);

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
    setPage(1);
  };

  const getBadgeConfig = (category: string) => {
    return ACTION_BADGE_CONFIG[category] || ACTION_BADGE_CONFIG.other;
  };

  if (isLoading) {
    return <SettingsLoadingSkeleton cards={1} rows={8} />;
  }

  return (
    <>
      <div className="flex flex-col gap-2 w-full">
        {/* Compact Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="password_reset">Password Reset</SelectItem>
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="helpdesk_tickets">Tickets</SelectItem>
              <SelectItem value="helpdesk_problems">Problems</SelectItem>
              <SelectItem value="helpdesk_changes">Changes</SelectItem>
              <SelectItem value="itam_assets">Assets</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="user_tools">Tools</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={showSessionActivity ? "default" : "outline"}
            className="h-8 text-xs px-3"
            onClick={() => setShowSessionActivity(!showSessionActivity)}
          >
            <Filter className="h-3 w-3 mr-1" />
            Sessions
          </Button>
          <Badge variant="secondary" className="text-xs font-normal h-6 px-2">
            {(totalCount || 0).toLocaleString()} logs
          </Badge>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExport}>
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-lg border flex-1">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[130px] text-xs">Timestamp</TableHead>
                <TableHead className="w-[130px] text-xs">User</TableHead>
                <TableHead className="w-[120px] text-xs">Action</TableHead>
                <TableHead className="w-[120px] text-xs">Module</TableHead>
                <TableHead className="text-xs">Details</TableHead>
                <TableHead className="w-[60px] text-xs">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm">No audit logs found</p>
                      <p className="text-xs">Try adjusting your filters or date range</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const badgeConfig = getBadgeConfig(log.actionCategory);

                  return (
                    <TableRow key={log.id} className="h-10">
                      <TableCell className="text-xs py-1.5 whitespace-nowrap text-muted-foreground">
                        {log.createdAt
                          ? format(new Date(log.createdAt), "MMM d, yyyy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs font-medium truncate block max-w-[140px] cursor-default">
                                {log.userName || log.userEmail || "System"}
                              </span>
                            </TooltipTrigger>
                            {(log.userEmail || log.userName) && (
                              <TooltipContent side="top">
                                <p>{log.userName && log.userEmail ? `${log.userName} (${log.userEmail})` : log.userEmail || log.userName}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge
                          variant="outline"
                          className={`${badgeConfig.className} border text-[10px] gap-1 px-1.5 py-0`}
                        >
                          {ACTION_ICONS[log.actionCategory]}
                          <span>{badgeConfig.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]">
                        <span className="text-xs font-medium">
                          {MODULE_DISPLAY_NAMES[log.entityType || ""] || log.entityType || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5 max-w-[300px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground truncate block cursor-default">
                                {summarizeLogChanges(log, uuidNameMap)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">{summarizeLogChanges(log, uuidNameMap)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleViewDetails(log)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {log.canRevert && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              onClick={() => handleRevert(log)}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
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

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {(totalCount || 0) > 0
              ? `Showing ${showingFrom}–${showingTo} of ${(totalCount || 0).toLocaleString()}`
              : "No logs found"}
            {search && filteredLogs.length !== logs.length && ` (${filteredLogs.length} filtered)`}
          </span>
          <div className="flex items-center gap-2">
            <Select value={String(perPage)} onValueChange={handlePerPageChange}>
              <SelectTrigger className="w-[90px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 / page</SelectItem>
                <SelectItem value="200">200 / page</SelectItem>
                <SelectItem value="500">500 / page</SelectItem>
              </SelectContent>
            </Select>
            {totalPages > 1 && (
              <div className="flex items-center gap-0.5">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(1)} disabled={page === 1}>
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AuditLogDetailsDialog
        log={selectedLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        uuidNameMap={uuidNameMap}
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
