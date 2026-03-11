import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, BarChart3, Settings, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { ProblemTableView } from "@/components/helpdesk/ProblemTableView";
import { TicketPagination } from "@/components/helpdesk/TicketPagination";
import { BulkActionsProblemButton } from "@/components/helpdesk/BulkActionsProblemButton";
import { CreateProblemDialog } from "@/components/helpdesk/CreateProblemDialog";
import { EditProblemDialog } from "@/components/helpdesk/EditProblemDialog";
import { AssignProblemDialog } from "@/components/helpdesk/AssignProblemDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getUserDisplayName } from "@/lib/userUtils";
import type { SortConfig } from "@/components/helpdesk/SortableTableHeader";

const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) { toast.error("No data to export"); return; }
  const headers = ["Problem #", "Title", "Status", "Priority", "Category", "Assignee", "Created At"];
  const rows = data.map(item => [
    item.problem_number || "", item.title || "", item.status || "", item.priority || "",
    item.category?.name || "", item.assigned_to_user?.name || "", item.created_at || ""
  ].map(value => {
    const s = String(value);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(","));
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success(`Exported ${data.length} records to ${filename}.csv`);
};

export default function ProblemsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialFilters: Record<string, any> = {};
  if (searchParams.get("status")) initialFilters.status = searchParams.get("status");
  if (searchParams.get("priority")) initialFilters.priority = searchParams.get("priority");

  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [createProblemOpen, setCreateProblemOpen] = useState(false);
  const [editProblem, setEditProblem] = useState<any>(null);
  const [assignProblem, setAssignProblem] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "created_at", direction: null });

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const { data: allProblems, isLoading } = useQuery({
    queryKey: ['helpdesk-problems'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('helpdesk_problems')
        .select(`*, category:helpdesk_categories(name), linked_tickets:helpdesk_problem_tickets(id, ticket_id)`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (data && data.length > 0) {
        const userAuthIds = [...new Set(data.flatMap((p: any) => [p.created_by, p.assigned_to]).filter(Boolean))];
        if (userAuthIds.length > 0) {
          const { data: users } = await supabase.from('users').select('id, auth_user_id, name, email').in('auth_user_id', userAuthIds as string[]);
          if (users) {
            const userMap: Record<string, any> = Object.fromEntries(users.map((u: any) => [u.auth_user_id, u]));
            return data.map((problem: any) => ({
              ...problem,
              created_by_user: problem.created_by ? userMap[problem.created_by] || null : null,
              assigned_to_user: problem.assigned_to ? userMap[problem.assigned_to] || null : null
            }));
          }
        }
      }
      return data || [];
    }
  });

  const problems = useMemo(() => (allProblems || []).filter((problem: any) => {
    if (filters.status && problem.status !== filters.status) return false;
    if (filters.priority && problem.priority !== filters.priority) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!(problem.title?.toLowerCase().includes(search) || problem.description?.toLowerCase().includes(search) || problem.problem_number?.toLowerCase().includes(search))) return false;
    }
    return true;
  }), [allProblems, filters]);

  const getProblemColumnValue = useCallback((item: any, column: string): string | number => {
    switch (column) {
      case "problem_number": return item.problem_number || "";
      case "title": return item.title || "";
      case "status": return item.status || "";
      case "priority": {
        const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[item.priority] ?? 4;
      }
      case "assignee": return getUserDisplayName(item.assigned_to_user) || "";
      case "category": return item.category?.name || "";
      case "tickets": return item.linked_tickets?.length || 0;
      case "rca": return item.root_cause ? "done" : "pending";
      case "created_at": return item.created_at || "";
      default: return "";
    }
  }, []);

  const sortedProblems = useMemo(() => {
    if (!sortConfig.direction) return problems;
    return [...problems].sort((a, b) => {
      const aVal = getProblemColumnValue(a, sortConfig.column);
      const bVal = getProblemColumnValue(b, sortConfig.column);
      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal;
      else cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: "base" });
      return sortConfig.direction === "desc" ? -cmp : cmp;
    });
  }, [problems, sortConfig, getProblemColumnValue]);

  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column
        ? prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc"
        : "asc",
    }));
    setCurrentPage(1);
  }, []);

  const quickStatusChange = useMutation({
    mutationFn: async ({ problemId, status }: { problemId: number; status: string }) => {
      const { error } = await supabase.from("helpdesk_problems").update({ status, updated_at: new Date().toISOString() }).eq("id", problemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problems"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-dashboard-stats"] });
      toast.success("Problem status updated");
    },
    onError: () => { toast.error("Failed to update problem status"); },
  });

  const handleSelectProblem = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked: boolean) => {
    const pageProblems = sortedProblems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    setSelectedIds(checked ? pageProblems.map((p: any) => p.id) : []);
  };

  const paginatedProblems = sortedProblems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search problems..." value={filters.search || ''} onChange={e => setFilters({ ...filters, search: e.target.value })} className="pl-8 h-7 text-xs" />
            </div>
            <Select value={filters.status || 'all'} onValueChange={value => setFilters({ ...filters, status: value === 'all' ? null : value })}>
              <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="known_error">Known Error</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority || 'all'} onValueChange={value => setFilters({ ...filters, priority: value === 'all' ? null : value })}>
              <SelectTrigger className="w-[90px] h-7 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <BulkActionsProblemButton selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} />
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => navigate("/tickets/reports")} className="h-7 w-7">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">View Reports</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Settings className="h-3.5 w-3.5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => navigate("/tickets/settings")}>Column Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => exportToCSV(problems, "problems-export")}>
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Export to CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={() => setCreateProblemOpen(true)} className="gap-1 h-7 px-3">
                <Plus className="h-3.5 w-3.5" /><span className="text-xs">New Problem</span>
              </Button>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ProblemTableView
            problems={paginatedProblems}
            selectedIds={selectedIds}
            onSelectProblem={handleSelectProblem}
            onSelectAll={handleSelectAll}
            onEditProblem={setEditProblem}
            onAssignProblem={setAssignProblem}
            onQuickStatusChange={(problemId, status) => quickStatusChange.mutate({ problemId, status })}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        )}
      </div>

      <TicketPagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={sortedProblems.length}
        totalPages={Math.ceil(sortedProblems.length / pageSize)}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        className="border-t-0"
      />

      <CreateProblemDialog open={createProblemOpen} onOpenChange={setCreateProblemOpen} />
      {editProblem && <EditProblemDialog problem={editProblem} open={!!editProblem} onOpenChange={(open) => !open && setEditProblem(null)} />}
      {assignProblem && <AssignProblemDialog problem={assignProblem} open={!!assignProblem} onOpenChange={(open) => !open && setAssignProblem(null)} />}
    </div>
  );
}