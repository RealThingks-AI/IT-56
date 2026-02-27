import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, UserPlus, Pencil, MoreHorizontal, UserX, KeyRound, ShieldCheck, Check, Trash2, Upload, Users, Copy, X, Download } from "lucide-react";
import { format } from "date-fns";
import { SettingsLoadingSkeleton } from "./SettingsLoadingSkeleton";
import { AddUserDialog } from "./AddUserDialog";
import { EditUserDialog, UserToEdit } from "./EditUserDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { BulkImportUsersDialog } from "./BulkImportUsersDialog";
import { normalizeRole, getUserInitials, type AppRole } from "@/lib/userUtils";
import { SortableTableHeader, type SortConfig } from "@/components/helpdesk/SortableTableHeader";
import { categorizeAction, ACTION_BADGE_CONFIG } from "@/lib/auditLogUtils";
import { ScrollText } from "lucide-react";

/** Small component to show recent audit activity for a user in the detail sheet */
function UserRecentActivity({ userId }: { userId: string }) {
  const { data: recentLogs = [], isLoading } = useQuery({
    queryKey: ["user-recent-activity", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action_type, entity_type, entity_id, created_at, metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  return (
    <div className="py-4 space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h4>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : recentLogs.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <ScrollText className="h-4 w-4" />
          <span>No recent activity</span>
        </div>
      ) : (
        <div className="space-y-2">
          {recentLogs.map((log) => {
            const category = categorizeAction(log.action_type);
            const badge = ACTION_BADGE_CONFIG[category] || ACTION_BADGE_CONFIG.other;
            const name = (log.metadata as Record<string, unknown>)?.name as string | undefined;
            return (
              <div key={log.id} className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className={`${badge.className} border text-[10px] px-1 py-0 shrink-0`}>
                  {badge.label}
                </Badge>
                <div className="min-w-0">
                  <span className="text-muted-foreground">{log.entity_type || "—"}</span>
                  {name && <span className="ml-1 font-medium">{name}</span>}
                  {log.created_at && (
                    <p className="text-muted-foreground/70">{format(new Date(log.created_at), "MMM d, HH:mm")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface User {
  id: string;
  auth_user_id: string;
  email: string;
  name: string | null;
  role: string;
  status: string | null;
  last_login: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  manager: "Manager",
  user: "User",
  viewer: "Viewer",
};

// Show all users on one page (no pagination)

const getRoleBadgeClass = (role: AppRole) => {
  switch (role) {
    case "admin":
      return "bg-primary/10 text-primary border-primary/20";
    case "manager":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "user":
      return "bg-muted text-muted-foreground border-border";
    case "viewer":
      return "bg-muted text-muted-foreground border-border";
  }
};

const getStatusBadge = (status: string | null) => {
  const s = status || "active";
  switch (s) {
    case "active":
      return { label: "Active", dot: "bg-emerald-500", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" };
    case "inactive":
      return { label: "Inactive", dot: "bg-muted-foreground", cls: "bg-muted text-muted-foreground border-border" };
    case "suspended":
      return { label: "Suspended", dot: "bg-destructive", cls: "bg-destructive/10 text-destructive border-destructive/20" };
    default:
      return { label: s, dot: "bg-emerald-500", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" };
  }
};

export function AdminUsers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "name", direction: "asc" });
  
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserToEdit | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<{
    id: string;
    authUserId: string;
    email: string;
    name: string | null;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    destructive?: boolean;
  }>({ open: false, title: "", description: "", action: () => {} });
  
  const queryClient = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);


  // Realtime subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel("users-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, auth_user_id, email, name, role, status, last_login, created_at")
        .order("created_at", { ascending: false });
      if (usersError) throw usersError;

      const { data: rolesData, error: rolesError } = await supabase.from("user_roles").select("user_id, role");
      if (rolesError) console.error("Error fetching roles:", rolesError);

      const rolesMap = new Map(rolesData?.map((r) => [r.user_id, r.role]) || []);
      return usersData.map((user) => ({
        ...user,
        role: normalizeRole(rolesMap.get(user.auth_user_id) || user.role),
      })) as User[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ authUserId, role }: { authUserId: string; role: AppRole }) => {
      const { error } = await supabase.rpc("update_user_role", { target_user_id: authUserId, new_role: role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("User role updated"); },
    onError: (error: Error) => { toast.error("Failed to update role: " + error.message); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ authUserId, status }: { authUserId: string; status: string }) => {
      const { error } = await supabase.rpc("update_user_status", { target_user_id: authUserId, new_status: status });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("User status updated"); },
    onError: (error: Error) => { toast.error("Failed to update status: " + error.message); },
  });

  const deleteUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `https://iarndwlbrmjbsjvugqvr.supabase.co/functions/v1/delete-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session?.access_token}` },
          body: JSON.stringify({ targetUserId }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete user");
      return result;
    },
    onSuccess: () => { toast.success("User deleted successfully"); },
    onError: (error: Error) => { toast.error("Failed to delete user: " + error.message); },
  });

  const handleSort = (column: string) => {
    setSortConfig((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = users.filter(
      (user) =>
        (user.email?.toLowerCase().includes(search.toLowerCase()) ||
          user.name?.toLowerCase().includes(search.toLowerCase())) &&
        (statusFilter === "all" || (user.status || "active") === statusFilter) &&
        (roleFilter === "all" || normalizeRole(user.role) === roleFilter)
    );

    result.sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      const col = sortConfig.column;
      let valA: string | number = "";
      let valB: string | number = "";

      switch (col) {
        case "name":
          valA = (a.name || a.email || "").toLowerCase();
          valB = (b.name || b.email || "").toLowerCase();
          break;
        case "email":
          valA = (a.email || "").toLowerCase();
          valB = (b.email || "").toLowerCase();
          break;
        case "role":
          valA = a.role || "";
          valB = b.role || "";
          break;
        case "status":
          valA = a.status || "active";
          valB = b.status || "active";
          break;
        case "last_login":
          valA = a.last_login ? new Date(a.last_login).getTime() : 0;
          valB = b.last_login ? new Date(b.last_login).getTime() : 0;
          break;
      }

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });

    return result;
  }, [users, search, statusFilter, roleFilter, sortConfig]);

  const paginatedUsers = filteredAndSortedUsers;

  const handleExportCSV = () => {
    if (filteredAndSortedUsers.length === 0) { toast.error("No users to export"); return; }
    const headers = ["Name", "Email", "Role", "Status", "Last Login", "Created"];
    const rows = filteredAndSortedUsers.map((u) => [
      u.name || "",
      u.email,
      normalizeRole(u.role),
      u.status || "active",
      u.last_login ? format(new Date(u.last_login), "yyyy-MM-dd HH:mm") : "",
      format(new Date(u.created_at), "yyyy-MM-dd"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredAndSortedUsers.length} users`);
  };

  const handleEditUser = (user: User) => {
    if (!user.auth_user_id) { toast.error("Cannot edit user: Missing auth user ID"); return; }
    setSelectedUser({
      id: user.id, authUserId: user.auth_user_id, email: user.email,
      name: user.name, status: user.status, role: user.role,
    });
    setEditUserOpen(true);
  };

  const handleResetPassword = (user: User) => {
    if (!user.auth_user_id) { toast.error("Cannot reset password: Missing auth user ID"); return; }
    setResetPasswordUser({
      id: user.id, authUserId: user.auth_user_id, email: user.email, name: user.name,
    });
    setResetPasswordOpen(true);
  };

  const handleDeactivateUser = (user: User) => {
    setConfirmDialog({
      open: true, title: "Deactivate User",
      description: `Are you sure you want to deactivate ${user.name || user.email}? Their account will be set to inactive.`,
      action: () => { updateStatus.mutate({ authUserId: user.auth_user_id, status: "inactive" }); setConfirmDialog((prev) => ({ ...prev, open: false })); },
    });
  };

  const handleReactivateUser = (user: User) => {
    updateStatus.mutate({ authUserId: user.auth_user_id, status: "active" });
  };

  const handleDeleteUser = (user: User) => {
    setConfirmDialog({
      open: true, title: "Delete User Permanently",
      description: `Are you sure you want to permanently delete ${user.name || user.email}? This action cannot be undone and will remove all user data.`,
      destructive: true,
      action: () => { deleteUser.mutate(user.auth_user_id); setConfirmDialog((prev) => ({ ...prev, open: false })); },
    });
  };

  const handleRoleChange = (user: User, role: AppRole) => {
    if (role === "admin" && normalizeRole(user.role) !== "admin") {
      setConfirmDialog({
        open: true, title: "Promote to Admin",
        description: `Are you sure you want to make ${user.name || user.email} an Admin? They will have full access to all features and settings.`,
        action: () => { updateRole.mutate({ authUserId: user.auth_user_id, role }); setConfirmDialog((prev) => ({ ...prev, open: false })); },
      });
    } else {
      updateRole.mutate({ authUserId: user.auth_user_id, role });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return <SettingsLoadingSkeleton cards={1} rows={6} />;
  }

  return (
    <>
      <div className="flex flex-col gap-2 h-full">
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search users... (Ctrl+K)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-xs font-normal h-6">
            {filteredAndSortedUsers.length} user{filteredAndSortedUsers.length !== 1 ? "s" : ""}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setBulkImportOpen(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => setAddUserOpen(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add User
            </Button>
          </div>
        </div>

        {/* Table with sticky header and scrollable body */}
        <div className="flex-1 overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 z-10">
              <TableRow className="h-8">
                <SortableTableHeader column="name" label="Name" sortConfig={sortConfig} onSort={handleSort} className="text-xs min-w-[160px]" />
                <SortableTableHeader column="email" label="Email" sortConfig={sortConfig} onSort={handleSort} className="text-xs min-w-[180px]" />
                <SortableTableHeader column="role" label="Role" sortConfig={sortConfig} onSort={handleSort} className="text-xs min-w-[90px]" />
                <SortableTableHeader column="status" label="Status" sortConfig={sortConfig} onSort={handleSort} className="text-xs min-w-[90px]" />
                <SortableTableHeader column="last_login" label="Last Login" sortConfig={sortConfig} onSort={handleSort} className="text-xs min-w-[100px]" />
                <th className="text-xs w-[44px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                    {search || statusFilter !== "all" || roleFilter !== "all" ? "No users match your filters" : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => {
                  const currentRole = normalizeRole(user.role);
                  const status = getStatusBadge(user.status);
                  return (
                    <TableRow key={user.id} className="group">
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                              {getUserInitials({ name: user.name, email: user.email })}
                            </AvatarFallback>
                          </Avatar>
                          <button
                            onClick={() => setDetailUser(user)}
                            className="text-sm font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left"
                          >
                            {user.name || "—"}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={`text-[11px] px-1.5 py-0 font-medium ${getRoleBadgeClass(currentRole)}`}>
                          {ROLE_LABELS[currentRole]}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className={`text-[11px] px-1.5 py-0 font-medium ${status.cls}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${status.dot}`} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                        {user.last_login ? format(new Date(user.last_login), "MMM d, yyyy") : "Never"}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <ShieldCheck className="h-4 w-4 mr-2" /> Change Role
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                                  <DropdownMenuItem key={role} onClick={() => handleRoleChange(user, role)} className="flex items-center justify-between">
                                    {ROLE_LABELS[role]}
                                    {currentRole === role && <Check className="h-4 w-4 ml-2 text-primary" />}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                              <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(user.status || "active") === "active" ? (
                              <DropdownMenuItem onClick={() => handleDeactivateUser(user)}>
                                <UserX className="h-4 w-4 mr-2" /> Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleReactivateUser(user)}>
                                <Users className="h-4 w-4 mr-2" /> Reactivate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete User
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
        </div>

      </div>

      {/* User Detail Sheet */}
      <Sheet open={!!detailUser} onOpenChange={(open) => { if (!open) setDetailUser(null); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {detailUser && (() => {
            const role = normalizeRole(detailUser.role);
            const status = getStatusBadge(detailUser.status);
            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                        {getUserInitials({ name: detailUser.name, email: detailUser.email })}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <SheetTitle className="text-base truncate">{detailUser.name || "—"}</SheetTitle>
                      <SheetDescription className="text-sm truncate flex items-center gap-1">
                        <span className="truncate">{detailUser.email}</span>
                        <button onClick={() => copyToClipboard(detailUser.email)} className="flex-shrink-0 text-muted-foreground hover:text-foreground">
                          <Copy className="h-3 w-3" />
                        </button>
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <Separator />

                <div className="py-4 space-y-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Info</h4>
                  <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
                    <span className="text-muted-foreground">Role</span>
                    <Badge variant="outline" className={`w-fit text-[11px] px-1.5 py-0 font-medium ${getRoleBadgeClass(role)}`}>
                      {ROLE_LABELS[role]}
                    </Badge>

                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className={`w-fit text-[11px] px-1.5 py-0 font-medium ${status.cls}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${status.dot}`} />
                      {status.label}
                    </Badge>

                    <span className="text-muted-foreground">Last Login</span>
                    <span>{detailUser.last_login ? format(new Date(detailUser.last_login), "MMM d, yyyy h:mm a") : "Never"}</span>

                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(detailUser.created_at), "MMM d, yyyy")}</span>

                    <span className="text-muted-foreground">Auth ID</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono truncate">
                        {detailUser.auth_user_id}
                      </code>
                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => copyToClipboard(detailUser.auth_user_id)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Recent Activity */}
                <UserRecentActivity userId={detailUser.auth_user_id} />

                <Separator />

                <div className="py-4 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h4>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { handleEditUser(detailUser); setDetailUser(null); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit Details
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { handleResetPassword(detailUser); setDetailUser(null); }}>
                    <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                  </Button>
                  {(detailUser.status || "active") === "active" ? (
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { handleDeactivateUser(detailUser); setDetailUser(null); }}>
                      <UserX className="h-4 w-4 mr-2" /> Deactivate User
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { handleReactivateUser(detailUser); setDetailUser(null); }}>
                      <Users className="h-4 w-4 mr-2" /> Reactivate User
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => { handleDeleteUser(detailUser); setDetailUser(null); }}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete User
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <AddUserDialog open={addUserOpen} onOpenChange={setAddUserOpen} />
      <BulkImportUsersDialog open={bulkImportOpen} onOpenChange={setBulkImportOpen} />
      <EditUserDialog open={editUserOpen} onOpenChange={setEditUserOpen} user={selectedUser} />
      <ResetPasswordDialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen} user={resetPasswordUser} />

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.action}
              className={confirmDialog.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
