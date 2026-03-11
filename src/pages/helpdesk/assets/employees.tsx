import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Users, CheckCircle, Package, PackageX, FileDown,
  MoreHorizontal, UserX, X, Send, Eye,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SortableTableHeader, SortConfig } from "@/components/helpdesk/SortableTableHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { EmployeeAssetsDialog } from "@/components/helpdesk/assets/EmployeeAssetsDialog";
import { StatCard } from "@/components/helpdesk/assets/StatCard";
import type { AppUser } from "@/hooks/useUsers";

const DEFAULT_PAGE_SIZE = 100;

import { getAvatarColor } from "@/lib/avatarUtils";
import { StatusDot } from "@/components/helpdesk/assets/StatusDot";
import { PaginationControls } from "@/components/helpdesk/assets/PaginationControls";

import { exportCSV } from "@/lib/assets/csvExportUtils";
import { sanitizeSearchInput } from "@/lib/utils";

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState("all");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<string>("all");
  const [employeeAssetFilter, setEmployeeAssetFilter] = useState<"all" | "with_assets" | "no_assets">("all");
  const [employeeSort, setEmployeeSort] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [employeePage, setEmployeePage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedEmployee, setSelectedEmployee] = useState<AppUser | null>(null);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, auth_user_id, name, email, role, status, avatar_url")
        .order("name");
      if (error) { console.error("Failed to fetch users:", error); return []; }
      return (data || []) as AppUser[];
    },
    staleTime: 60 * 1000,
  });

  // Realtime subscription for auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel("employees-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        queryClient.invalidateQueries({ queryKey: ["employees-all"] });
        queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Auto-open employee dialog when ?user= param is present
  useEffect(() => {
    const userParam = searchParams.get("user");
    if (userParam && employees.length > 0 && !employeeDialogOpen) {
      const found = employees.find(e => e.id === userParam || e.auth_user_id === userParam);
      if (found) {
        setSelectedEmployee(found);
        setEmployeeDialogOpen(true);
        searchParams.delete("user");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, employees, employeeDialogOpen]);

  const { data: assetCounts = {} } = useQuery({
    queryKey: ["employee-asset-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("assigned_to")
        .eq("is_active", true)
        .eq("is_hidden", false)
        .not("assigned_to", "is", null);
      const counts: Record<string, number> = {};
      data?.forEach((a) => {
        if (a.assigned_to) counts[a.assigned_to] = (counts[a.assigned_to] || 0) + 1;
      });
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });

  const getEmployeeAssetCount = (emp: AppUser) =>
    (assetCounts[emp.id] || 0) + (emp.auth_user_id && emp.auth_user_id !== emp.id ? (assetCounts[emp.auth_user_id] || 0) : 0);

  const handleEmployeeSort = (column: string) => {
    setEmployeeSort(prev => ({
      column,
      direction: prev.column === column ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  };

  const filteredEmployees = employees
    .filter((emp) => {
      if (employeeStatusFilter === "not_active" && emp.status === "active") return false;
      else if (employeeStatusFilter !== "all" && employeeStatusFilter !== "not_active" && emp.status !== employeeStatusFilter) return false;
      if (employeeRoleFilter !== "all" && (emp.role || "user") !== employeeRoleFilter) return false;
      if (employeeAssetFilter === "with_assets" && getEmployeeAssetCount(emp) === 0) return false;
      if (employeeAssetFilter === "no_assets" && getEmployeeAssetCount(emp) > 0) return false;
      if (employeeSearch) {
        const s = sanitizeSearchInput(employeeSearch).toLowerCase();
        return emp.name?.toLowerCase().includes(s) ||
          emp.email?.toLowerCase().includes(s);
      }
      return true;
    })
    .sort((a, b) => {
      const { column, direction } = employeeSort;
      if (!direction) return 0;
      const mult = direction === "asc" ? 1 : -1;
      if (column === "assets") return (getEmployeeAssetCount(a) - getEmployeeAssetCount(b)) * mult;
      const valA = (column === "name" ? a.name : column === "email" ? a.email : column === "role" ? (a.role || "user") : a.status) || "";
      const valB = (column === "name" ? b.name : column === "email" ? b.email : column === "role" ? (b.role || "user") : b.status) || "";
      return valA.localeCompare(valB) * mult;
    });

  const employeeTotalPages = Math.ceil(filteredEmployees.length / pageSize);
  const paginatedEmployees = filteredEmployees.slice((employeePage - 1) * pageSize, employeePage * pageSize);

  const clearFilters = useCallback(() => {
    setEmployeeRoleFilter("all");
    setEmployeeStatusFilter("all");
    setEmployeeAssetFilter("all");
    setEmployeeSearch("");
    setEmployeePage(1);
  }, []);

  const hasFilters = employeeRoleFilter !== "all" || employeeStatusFilter !== "all" || employeeAssetFilter !== "all" || !!employeeSearch;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-2.5">
        {/* Stat Cards */}
        {loadingEmployees ? (
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[68px] rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <StatCard
              icon={Users} value={employees.length} label="Total Employees"
              colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              onClick={clearFilters} active={!hasFilters}
            />
            <StatCard
              icon={CheckCircle} value={employees.filter(e => e.status === "active").length} label="Active"
              colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              onClick={() => { setEmployeeStatusFilter("active"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("all"); setEmployeePage(1); }}
              active={employeeStatusFilter === "active" && employeeRoleFilter === "all" && employeeAssetFilter === "all"}
            />
            <StatCard
              icon={UserX} value={employees.filter(e => e.status !== "active").length} label="Inactive"
              colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              onClick={() => { setEmployeeStatusFilter("not_active"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("all"); setEmployeePage(1); }}
              active={employeeStatusFilter === "not_active" && employeeRoleFilter === "all" && employeeAssetFilter === "all"}
            />
            <StatCard
              icon={Package} value={Object.values(assetCounts).reduce((sum, c) => sum + c, 0)} label="Assets Assigned"
              colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
              onClick={() => { setEmployeeStatusFilter("all"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("with_assets"); setEmployeePage(1); }}
              active={employeeAssetFilter === "with_assets" && employeeStatusFilter === "all" && employeeRoleFilter === "all"}
            />
            <StatCard
              icon={PackageX} value={employees.filter(e => getEmployeeAssetCount(e) === 0).length} label="No Assets"
              colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
              onClick={() => { setEmployeeStatusFilter("all"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("no_assets"); setEmployeePage(1); }}
              active={employeeAssetFilter === "no_assets" && employeeStatusFilter === "all" && employeeRoleFilter === "all"}
            />
          </div>
        )}

        <Card className="shadow-sm flex-1 flex flex-col overflow-hidden">
          <CardContent className="pt-3 space-y-3 flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-[220px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => { setEmployeeSearch(e.target.value); setEmployeePage(1); }}
                  className="pl-7 pr-2 h-7 text-xs"
                />
              </div>
              <Badge variant="secondary" className="text-xs tabular-nums h-5">
                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
              </Badge>
              <Select value={employeeRoleFilter} onValueChange={(v) => { setEmployeeRoleFilter(v); setEmployeePage(1); }}>
                <SelectTrigger className={`w-[150px] h-7 text-xs ${employeeRoleFilter !== "all" ? "bg-primary/15 border-primary/40 font-medium" : ""}`}><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={employeeStatusFilter} onValueChange={(v) => { setEmployeeStatusFilter(v); setEmployeePage(1); }}>
                <SelectTrigger className={`w-[150px] h-7 text-xs ${employeeStatusFilter !== "all" ? "bg-primary/15 border-primary/40 font-medium" : ""}`}><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="not_active">All Non-Active</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => exportCSV(filteredEmployees.map(e => ({
                  Name: e.name || "",
                  Email: e.email || "",
                  Role: e.role || "user",
                  Status: e.status || "",
                  "Assets Assigned": getEmployeeAssetCount(e),
                })), "employees")}>
                  <FileDown className="h-3.5 w-3.5 mr-1" />
                  Export
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/admin/users")}>
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Manage Users
                </Button>
                {hasFilters && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <colgroup>
                <col />
                <col />
                <col className="w-[90px]" />
                <col className="w-[90px]" />
                <col className="w-[70px]" />
                <col className="w-[50px]" />
              </colgroup>
              <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <SortableTableHeader column="name" label="Name" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <SortableTableHeader column="email" label="Email" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <SortableTableHeader column="role" label="Role" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <SortableTableHeader column="status" label="Status" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <SortableTableHeader column="assets" label="Assets" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <TableHead className="text-center w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEmployees ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`skel-${i}`} className="h-9">
                      <TableCell className="py-1"><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-3 w-24" /></div></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-3 w-32" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-3 w-14" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-3 w-8" /></TableCell>
                      <TableCell className="py-1"><Skeleton className="h-6 w-6" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No employees found</p>
                        {hasFilters && (
                          <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees.map((employee) => {
                    const assetCount = getEmployeeAssetCount(employee);
                    const initials = employee.name
                      ? employee.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                      : (employee.email?.[0] || "?").toUpperCase();
                    return (
                      <TableRow
                        key={employee.id}
                        className="h-9 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => { setSelectedEmployee(employee); setEmployeeDialogOpen(true); }}
                        title="Click to view assigned assets"
                      >
                        <TableCell className="font-medium py-1">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={`text-[10px] font-medium ${getAvatarColor(employee.name || employee.email)}`}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[180px] text-xs">{employee.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate py-1" title={employee.email}>
                          {employee.email || "—"}
                        </TableCell>
                        <TableCell className="text-xs capitalize py-1">{employee.role || "user"}</TableCell>
                        <TableCell className="py-1">
                          <StatusDot
                            status={employee.status === "active" ? "active" : employee.status === "suspended" ? "pending" : "inactive"}
                            label={employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : "Unknown"}
                          />
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium tabular-nums">{assetCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); setSelectedEmployee(employee); setEmployeeDialogOpen(true); }}>
                                <Eye className="h-3.5 w-3.5 mr-2" />
                                View Assets
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/assets/checkout?user=${employee.id}`); }}>
                                <Package className="h-3.5 w-3.5 mr-2" />
                                Assign Asset
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/admin/users?edit=${employee.id}`); }}>
                                <Users className="h-3.5 w-3.5 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={(e) => { e.stopPropagation(); window.open(`mailto:${employee.email}`, "_blank"); }}>
                                <Send className="h-3.5 w-3.5 mr-2" />
                                Email User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </ScrollArea>

          </CardContent>

          <PaginationControls
            currentPage={employeePage}
            totalPages={employeeTotalPages}
            totalItems={filteredEmployees.length}
            itemsPerPage={pageSize}
            onPageChange={setEmployeePage}
            showRowsPerPage
            pageSize={pageSize}
            onPageSizeChange={(v) => { setPageSize(v); setEmployeePage(1); }}
          />
        </Card>
      </div>

      {/* Employee Assets Dialog */}
      {selectedEmployee && (
        <EmployeeAssetsDialog
          open={employeeDialogOpen}
          onOpenChange={setEmployeeDialogOpen}
          employee={selectedEmployee}
        />
      )}
    </div>
  );
}
