import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
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
import { Users, Search, UserPlus, Pencil, MoreHorizontal, UserX, KeyRound, ShieldCheck, Check, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { SettingsLoadingSkeleton } from "./SettingsLoadingSkeleton";
import { AddUserDialog } from "./AddUserDialog";
import { EditUserDialog, UserToEdit } from "./EditUserDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { normalizeRole, getUserInitials, type AppRole } from "@/lib/userUtils";

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

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "active":
      return "text-emerald-600 dark:text-emerald-400";
    case "inactive":
      return "text-muted-foreground";
    case "suspended":
      return "text-destructive";
    default:
      return "text-emerald-600 dark:text-emerald-400";
  }
};

export function AdminUsers() {
  const [search, setSearch] = useState("");
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserToEdit | null>(null);
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

  // Realtime subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel("users-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        () => queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, auth_user_id, email, name, role, status, last_login, created_at")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      const rolesMap = new Map(rolesData?.map((r) => [r.user_id, r.role]) || []);

      return usersData.map((user) => ({
        ...user,
        role: normalizeRole(rolesMap.get(user.auth_user_id) || user.role),
      })) as User[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ authUserId, role }: { authUserId: string; role: AppRole }) => {
      const { error } = await supabase.rpc("update_user_role", {
        target_user_id: authUserId,
        new_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User role updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ authUserId, status }: { authUserId: string; status: string }) => {
      const { error } = await supabase.rpc("update_user_status", {
        target_user_id: authUserId,
        new_status: status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User status updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `https://iarndwlbrmjbsjvugqvr.supabase.co/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ targetUserId }),
        }
      );
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }
      return result;
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete user: " + error.message);
    },
  });

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditUser = (user: User) => {
    if (!user.auth_user_id) {
      toast.error("Cannot edit user: Missing auth user ID");
      return;
    }
    
    setSelectedUser({
      id: user.id,
      authUserId: user.auth_user_id,
      email: user.email,
      name: user.name,
      status: user.status,
      role: user.role,
    });
    setEditUserOpen(true);
  };

  const handleResetPassword = (user: User) => {
    if (!user.auth_user_id) {
      toast.error("Cannot reset password: Missing auth user ID");
      return;
    }
    
    setResetPasswordUser({
      id: user.id,
      authUserId: user.auth_user_id,
      email: user.email,
      name: user.name,
    });
    setResetPasswordOpen(true);
  };

  const handleDeactivateUser = (user: User) => {
    setConfirmDialog({
      open: true,
      title: "Deactivate User",
      description: `Are you sure you want to deactivate ${user.name || user.email}? Their account will be set to inactive.`,
      action: () => {
        updateStatus.mutate({ authUserId: user.auth_user_id, status: "inactive" });
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleReactivateUser = (user: User) => {
    updateStatus.mutate({ authUserId: user.auth_user_id, status: "active" });
  };

  const handleDeleteUser = (user: User) => {
    setConfirmDialog({
      open: true,
      title: "Delete User Permanently",
      description: `Are you sure you want to permanently delete ${user.name || user.email}? This action cannot be undone and will remove all user data.`,
      destructive: true,
      action: () => {
        deleteUser.mutate(user.auth_user_id);
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleRoleChange = (user: User, role: AppRole) => {
    if (role === "admin" && normalizeRole(user.role) !== "admin") {
      setConfirmDialog({
        open: true,
        title: "Promote to Admin",
        description: `Are you sure you want to make ${user.name || user.email} an Admin? They will have full access to all features and settings.`,
        action: () => {
          updateRole.mutate({ authUserId: user.auth_user_id, role });
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        },
      });
    } else {
      updateRole.mutate({ authUserId: user.auth_user_id, role });
    }
  };

  if (isLoading) {
    return <SettingsLoadingSkeleton cards={1} rows={6} />;
  }

  return (
    <>
      <SettingsCard
        title="User Directory"
        description="Manage users and their roles within your organization"
      >
        <div className="space-y-3">
          {/* Search + Add User inline */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button size="sm" className="ml-auto" onClick={() => setAddUserOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="h-9">
                  <TableHead className="text-xs min-w-[160px]">Name</TableHead>
                  <TableHead className="text-xs min-w-[200px]">Email</TableHead>
                  <TableHead className="text-xs min-w-[80px]">Role</TableHead>
                  <TableHead className="text-xs min-w-[80px]">Status</TableHead>
                  <TableHead className="text-xs min-w-[100px] whitespace-nowrap">Last Login</TableHead>
                  <TableHead className="text-xs min-w-[100px] whitespace-nowrap">Created</TableHead>
                  <TableHead className="text-xs w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                      {search ? "No users match your search" : "No users found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const currentRole = normalizeRole(user.role);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="py-1.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 flex-shrink-0">
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                {getUserInitials({ name: user.name, email: user.email })}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {user.name || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-sm text-muted-foreground">
                            {user.email}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className="text-sm capitalize">
                            {ROLE_LABELS[currentRole]}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className={`text-sm capitalize ${getStatusColor(user.status)}`}>
                            {user.status || "Active"}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          {user.last_login
                            ? format(new Date(user.last_login), "MMM d, yyyy")
                            : "Never"}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(user.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              
                              {/* Role change submenu */}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Change Role
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                                    <DropdownMenuItem
                                      key={role}
                                      onClick={() => handleRoleChange(user, role)}
                                      className="flex items-center justify-between"
                                    >
                                      {ROLE_LABELS[role]}
                                      {currentRole === role && (
                                        <Check className="h-4 w-4 ml-2 text-primary" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                <KeyRound className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {user.status === "active" ? (
                                <DropdownMenuItem
                                  onClick={() => handleDeactivateUser(user)}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Deactivate User
                                </DropdownMenuItem>
                              ) : user.status !== "active" && (
                                <DropdownMenuItem
                                  onClick={() => handleReactivateUser(user)}
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Reactivate User
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
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

          <p className="text-xs text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </div>
      </SettingsCard>

      {/* Add User Dialog */}
      <AddUserDialog open={addUserOpen} onOpenChange={setAddUserOpen} />

      {/* Edit User Dialog */}
      <EditUserDialog
        open={editUserOpen}
        onOpenChange={setEditUserOpen}
        user={selectedUser}
      />

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        user={resetPasswordUser}
      />

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
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
