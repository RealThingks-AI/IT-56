import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Users, CheckCircle, Package, PackageX, FileDown,
  ChevronLeft, ChevronRight, Loader2, MoreHorizontal, UserX, X, Send, Eye,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SortableTableHeader, SortConfig } from "@/components/helpdesk/SortableTableHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmployeeAssetsDialog } from "@/components/helpdesk/assets/EmployeeAssetsDialog";
import { StatCard } from "@/components/helpdesk/assets/StatCard";
import type { AppUser } from "@/hooks/useUsers";

const ITEMS_PER_PAGE = 50;

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const StatusDot = ({ status, label }: { status: "active" | "inactive" | "pending"; label: string }) => {
  const dotColor = { active: "bg-green-500", inactive: "bg-red-500", pending: "bg-yellow-500" }[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};

const PaginationControls = ({
  currentPage, totalPages, totalItems, itemsPerPage, onPageChange,
}: { currentPage: number; totalPages: number; totalItems: number; itemsPerPage: number; onPageChange: (page: number) => void }) => {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  return (
    <div className="flex items-center justify-between pt-3 px-1">
      <p className="text-xs text-muted-foreground">Showing {start}–{end} of {totalItems}</p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

const exportCSV = (rows: Record<string, string | number>[], filename: string) => {
  if (rows.length === 0) { toast.info("No data to export"); return; }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} records`);
};

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState("all");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("all");
  const [employeeAssetFilter, setEmployeeAssetFilter] = useState<"all" | "with_assets" | "no_assets">("all");
  const [employeeSort, setEmployeeSort] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [employeePage, setEmployeePage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<AppUser | null>(null);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["app-users-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, auth_user_id, name, email, role, status")
        .order("name");
      if (error) { console.error("Failed to fetch users:", error); return []; }
      return (data || []) as AppUser[];
    },
    staleTime: 2 * 60 * 1000,
  });

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
      if (employeeStatusFilter !== "all" && emp.status !== employeeStatusFilter) return false;
      if (employeeRoleFilter !== "all" && (emp.role || "user") !== employeeRoleFilter) return false;
      if (employeeAssetFilter === "with_assets" && getEmployeeAssetCount(emp) === 0) return false;
      if (employeeAssetFilter === "no_assets" && getEmployeeAssetCount(emp) > 0) return false;
      if (employeeSearch) {
        return emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          emp.email?.toLowerCase().includes(employeeSearch.toLowerCase());
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

  const employeeTotalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice((employeePage - 1) * ITEMS_PER_PAGE, employeePage * ITEMS_PER_PAGE);

  const clearFilters = useCallback(() => {
    setEmployeeRoleFilter("all");
    setEmployeeStatusFilter("all");
    setEmployeeAssetFilter("all");
    setEmployeeSearch("");
    setEmployeePage(1);
  }, []);

  const hasFilters = employeeRoleFilter !== "all" || employeeStatusFilter !== "all" || employeeAssetFilter !== "all" || !!employeeSearch;

  return (
    <div className="h-full flex flex-col bg-background overflow-auto">
      <div className="p-4 space-y-4">
        {/* Stat Cards */}
        {loadingEmployees ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[68px] rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
              onClick={() => { setEmployeeStatusFilter("inactive"); setEmployeeRoleFilter("all"); setEmployeeAssetFilter("all"); setEmployeePage(1); }}
              active={employeeStatusFilter === "inactive" && employeeRoleFilter === "all" && employeeAssetFilter === "all"}
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

        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative max-w-sm flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => { setEmployeeSearch(e.target.value); setEmployeePage(1); }}
                  className="pl-9 pr-8 h-8"
                />
                {employeeSearch && (
                  <button onClick={() => setEmployeeSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Badge variant="secondary" className="text-xs tabular-nums">
                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
              </Badge>
              <Select value={employeeRoleFilter} onValueChange={(v) => { setEmployeeRoleFilter(v); setEmployeePage(1); }}>
                <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={employeeStatusFilter} onValueChange={(v) => { setEmployeeStatusFilter(v); setEmployeePage(1); }}>
                <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportCSV(filteredEmployees.map(e => ({
                  Name: e.name || "",
                  Email: e.email || "",
                  Role: e.role || "user",
                  Status: e.status || "",
                  "Assets Assigned": getEmployeeAssetCount(e),
                })), "employees")}>
                  <FileDown className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button size="sm" variant="outline" className="h-8" onClick={() => window.open("/admin/users", "_blank")}>
                  <Users className="h-4 w-4 mr-1.5" />
                  Manage Users
                </Button>
                {hasFilters && (
                  <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <SortableTableHeader column="name" label="Name" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <SortableTableHeader column="email" label="Email" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <SortableTableHeader column="role" label="Role" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <SortableTableHeader column="status" label="Status" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <SortableTableHeader column="assets" label="Assets" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                  <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEmployees ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
                        <p className="text-sm text-muted-foreground">Loading employees...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
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
                        className="h-11 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => { setSelectedEmployee(employee); setEmployeeDialogOpen(true); }}
                        title="Click to view assigned assets"
                      >
                        <TableCell className="font-medium py-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className={`text-xs font-medium ${getAvatarColor(employee.name || employee.email)}`}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[180px]">{employee.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate py-2" title={employee.email}>
                          {employee.email || "—"}
                        </TableCell>
                        <TableCell className="text-sm capitalize py-2">{employee.role || "user"}</TableCell>
                        <TableCell className="py-2">
                          <StatusDot
                            status={employee.status === "active" ? "active" : employee.status === "suspended" ? "pending" : "inactive"}
                            label={employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : "Unknown"}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium tabular-nums">{assetCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedEmployee(employee); setEmployeeDialogOpen(true); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Assets
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/assets/checkout?user=${employee.id}`); }}>
                                <Package className="h-4 w-4 mr-2" />
                                Assign Asset
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/users?edit=${employee.id}`); }}>
                                <Users className="h-4 w-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`mailto:${employee.email}`, "_blank"); }}>
                                <Send className="h-4 w-4 mr-2" />
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

            <PaginationControls
              currentPage={employeePage}
              totalPages={employeeTotalPages}
              totalItems={filteredEmployees.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setEmployeePage}
            />
          </CardContent>
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
