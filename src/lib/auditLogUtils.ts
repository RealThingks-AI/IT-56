import { supabase } from "@/integrations/supabase/client";

export interface AuditLogChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ParsedAuditLog {
  id: string;
  actionType: string;
  actionCategory: "created" | "updated" | "deleted" | "assigned" | "bulk_deleted" | "login" | "logout" | "other";
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  changes: AuditLogChange[];
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | null;
  canRevert: boolean;
}

export const ACTION_BADGE_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  created: {
    label: "Created Record",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    icon: "plus-circle",
  },
  updated: {
    label: "Updated Record",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: "refresh-cw",
  },
  deleted: {
    label: "Deleted Record",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: "trash-2",
  },
  bulk_deleted: {
    label: "Bulk Deleted",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    icon: "alert-triangle",
  },
  assigned: {
    label: "Assigned",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400 border-violet-200 dark:border-violet-800",
    icon: "user-plus",
  },
  login: {
    label: "Login",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400 border-sky-200 dark:border-sky-800",
    icon: "log-in",
  },
  logout: {
    label: "Logout",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-800",
    icon: "log-out",
  },
  other: {
    label: "Action",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400 border-gray-200 dark:border-gray-800",
    icon: "activity",
  },
};

export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  helpdesk_tickets: "Tickets",
  helpdesk_problems: "Problems",
  helpdesk_changes: "Changes",
  helpdesk_categories: "Categories",
  itam_assets: "Assets",
  itam_categories: "Asset Categories",
  itam_vendors: "Vendors",
  itam_locations: "Locations",
  users: "Users",
  user_roles: "User Roles",
  user_tools: "User Tools",
  organisations: "Organizations",
  subscriptions_tools: "Subscriptions",
  audit_logs: "Audit Logs",
  system_settings: "System Settings",
};

export function categorizeAction(actionType: string): ParsedAuditLog["actionCategory"] {
  const action = actionType.toLowerCase();
  if (action.includes("bulk") && action.includes("delet")) return "bulk_deleted";
  if (action.includes("creat") || action.includes("insert") || action.includes("add")) return "created";
  if (action.includes("updat") || action.includes("modif") || action.includes("edit") || action.includes("change")) return "updated";
  if (action.includes("delet") || action.includes("remov")) return "deleted";
  if (action.includes("assign")) return "assigned";
  if (action.includes("login") || action.includes("sign_in") || action.includes("signin")) return "login";
  if (action.includes("logout") || action.includes("sign_out") || action.includes("signout")) return "logout";
  return "other";
}

export function parseMetadataChanges(metadata: Record<string, unknown> | null): AuditLogChange[] {
  if (!metadata) return [];

  const changes: AuditLogChange[] = [];

  // Check for standard old_values/new_values format
  if (metadata.old_values && metadata.new_values) {
    const oldValues = metadata.old_values as Record<string, unknown>;
    const newValues = metadata.new_values as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);

    allKeys.forEach((key) => {
      if (oldValues[key] !== newValues[key]) {
        changes.push({
          field: formatFieldName(key),
          oldValue: oldValues[key],
          newValue: newValues[key],
        });
      }
    });
    return changes;
  }

  // Check for changes array format
  if (Array.isArray(metadata.changes)) {
    return metadata.changes.map((change: Record<string, unknown>) => ({
      field: formatFieldName(String(change.field || change.key || "unknown")),
      oldValue: change.old_value ?? change.oldValue ?? change.from,
      newValue: change.new_value ?? change.newValue ?? change.to,
    }));
  }

  // Check for flat changes object
  if (metadata.changes && typeof metadata.changes === "object") {
    const changesObj = metadata.changes as Record<string, unknown>;
    return Object.entries(changesObj).map(([field, value]) => ({
      field: formatFieldName(field),
      oldValue: null,
      newValue: value,
    }));
  }

  // Try to extract from root level (excluding known meta fields)
  const excludeKeys = ["id", "user_id", "created_at", "updated_at", "organisation_id", "tenant_id", "ip_address", "user_agent"];
  const rootChanges = Object.entries(metadata)
    .filter(([key]) => !excludeKeys.includes(key))
    .slice(0, 5); // Limit to 5 changes

  if (rootChanges.length > 0) {
    return rootChanges.map(([field, value]) => ({
      field: formatFieldName(field),
      oldValue: null,
      newValue: value,
    }));
  }

  return [];
}

export function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  const str = String(value);
  return str.length > 50 ? str.substring(0, 47) + "..." : str;
}

export function canRevertLog(log: { action_type: string; metadata: Record<string, unknown> | null }): boolean {
  const category = categorizeAction(log.action_type);
  if (category !== "updated") return false;
  
  const metadata = log.metadata;
  if (!metadata) return false;
  
  // Can revert if we have old_values stored
  return !!(metadata.old_values && typeof metadata.old_values === "object");
}

export async function revertAuditLog(
  log: {
    id: string;
    entity_type: string | null;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
  },
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!log.entity_type || !log.entity_id || !log.metadata?.old_values) {
    return { success: false, error: "Missing required data for revert" };
  }

  const oldValues = log.metadata.old_values as Record<string, unknown>;
  const tableName = log.entity_type;

  try {
    // Perform the revert update
    const { error } = await supabase
      .from(tableName as "users")
      .update(oldValues)
      .eq("id", log.entity_id);

    if (error) throw error;

    // Create audit log for the revert action
    await supabase.from("audit_logs").insert([{
      action_type: "Reverted",
      entity_type: tableName,
      entity_id: log.entity_id,
      user_id: userId,
      metadata: JSON.parse(JSON.stringify({
        reverted_log_id: log.id,
        restored_values: oldValues,
      })),
    }]);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revert changes",
    };
  }
}

export function exportLogsToCSV(logs: ParsedAuditLog[], filename: string = "audit-logs"): void {
  const headers = ["Timestamp", "User", "Action", "Module", "Record ID", "Changes", "IP Address"];
  
  const rows = logs.map((log) => [
    log.createdAt || "",
    log.userName || log.userEmail || "System",
    log.actionType,
    MODULE_DISPLAY_NAMES[log.entityType || ""] || log.entityType || "",
    log.entityId || "",
    log.changes.map((c) => `${c.field}: ${formatChangeValue(c.oldValue)} → ${formatChangeValue(c.newValue)}`).join("; "),
    log.ipAddress || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
