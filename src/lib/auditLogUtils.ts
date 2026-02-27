import { supabase } from "@/integrations/supabase/client";

export interface AuditLogChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ParsedAuditLog {
  id: string;
  actionType: string;
  actionCategory: "created" | "updated" | "deleted" | "assigned" | "bulk_deleted" | "login" | "logout" | "password_reset" | "other";
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

// UUID pattern for detection
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUUID(value: unknown): boolean {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// Fields to exclude from display (internal/system fields)
const HIDDEN_METADATA_KEYS = new Set([
  "id", "user_id", "created_at", "updated_at", "tenant_id", "ip_address",
  "user_agent", "auth_user_id", "is_first_user", "old_values", "new_values",
  "changes", "record_name",
]);

// Fields that are noise in change summaries (auto-set by triggers)
const NOISE_CHANGE_FIELDS = new Set([
  "updated_at", "created_at", "last_login",
]);

// Human-readable field name mapping
const FIELD_LABEL_MAP: Record<string, string> = {
  email: "Email",
  name: "Name",
  role: "Role",
  account_type: "Account Type",
  user_type: "User Type",
  is_active: "Active",
  tool_name: "Tool Name",
  tool_id: "Tool",
  assigned_by: "Assigned By",
  assigned_to: "Assigned To",
  target_email: "Target User",
  reset_by: "Reset By",
  action_description: "Description",
  status: "Status",
  priority: "Priority",
  category: "Category",
  department: "Department",
  location: "Location",
  serial_number: "Serial Number",
  asset_tag: "Asset Tag",
  purchase_price: "Purchase Price",
  ticket_number: "Ticket Number",
  problem_number: "Problem Number",
  description: "Description",
  notes: "Notes",
  phone: "Phone",
  avatar_url: "Avatar",
  check_out_notes: "Check-Out Notes",
  checked_out_to: "Checked Out To",
  checked_out_at: "Checked Out At",
  expected_return_date: "Expected Return",
};

export const ACTION_BADGE_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  created: {
    label: "Created",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    icon: "plus-circle",
  },
  updated: {
    label: "Updated",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: "refresh-cw",
  },
  deleted: {
    label: "Deleted",
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
  password_reset: {
    label: "Password Reset",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: "key-round",
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
  subscriptions_tools: "Subscriptions",
  audit_logs: "Audit Logs",
  system_settings: "System Settings",
};

export function categorizeAction(actionType: string): ParsedAuditLog["actionCategory"] {
  const action = actionType.toLowerCase();
  if (action.includes("password") && action.includes("reset")) return "password_reset";
  if (action.includes("bulk") && action.includes("delet")) return "bulk_deleted";
  if (action.includes("creat") || action.includes("insert") || action.includes("add")) return "created";
  if (action.includes("updat") || action.includes("modif") || action.includes("edit") || action.includes("change")) return "updated";
  if (action.includes("delet") || action.includes("remov")) return "deleted";
  if (action.includes("assign")) return "assigned";
  if (action.includes("login") || action.includes("sign_in") || action.includes("signin")) return "login";
  if (action.includes("logout") || action.includes("sign_out") || action.includes("signout")) return "logout";
  return "other";
}

export function parseMetadataChanges(
  metadata: Record<string, unknown> | null,
  uuidNameMap?: Map<string, string>
): AuditLogChange[] {
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
          oldValue: resolveDisplayValue(oldValues[key], uuidNameMap),
          newValue: resolveDisplayValue(newValues[key], uuidNameMap),
        });
      }
    });
    return changes;
  }

  // Check for changes array format
  if (Array.isArray(metadata.changes)) {
    return metadata.changes.map((change: Record<string, unknown>) => ({
      field: formatFieldName(String(change.field || change.key || "unknown")),
      oldValue: resolveDisplayValue(change.old_value ?? change.oldValue ?? change.from, uuidNameMap),
      newValue: resolveDisplayValue(change.new_value ?? change.newValue ?? change.to, uuidNameMap),
    }));
  }

  // Check for flat changes object
  if (metadata.changes && typeof metadata.changes === "object") {
    const changesObj = metadata.changes as Record<string, unknown>;
    return Object.entries(changesObj).map(([field, value]) => ({
      field: formatFieldName(field),
      oldValue: null,
      newValue: resolveDisplayValue(value, uuidNameMap),
    }));
  }

  // Extract from root level (excluding hidden fields)
  const rootChanges = Object.entries(metadata)
    .filter(([key]) => !HIDDEN_METADATA_KEYS.has(key))
    .slice(0, 6);

  if (rootChanges.length > 0) {
    return rootChanges.map(([field, value]) => ({
      field: formatFieldName(field),
      oldValue: null,
      newValue: resolveDisplayValue(value, uuidNameMap),
    }));
  }

  return [];
}

function resolveDisplayValue(value: unknown, uuidNameMap?: Map<string, string>): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && isUUID(value) && uuidNameMap?.has(value)) {
    return uuidNameMap.get(value)!;
  }
  return value;
}

export function formatFieldName(field: string): string {
  if (FIELD_LABEL_MAP[field]) return FIELD_LABEL_MAP[field];
  return field
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatChangeValue(value: unknown, uuidNameMap?: Map<string, string>): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && isUUID(value)) {
    if (uuidNameMap?.has(value)) return uuidNameMap.get(value)!;
    return value.slice(0, 8) + "…";
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.length === 0 ? "—" : value.map(v => formatChangeValue(v, uuidNameMap)).join(", ");
    }
    try {
      // For objects, show key-value pairs
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length <= 2) {
        return entries.map(([k, v]) => `${formatFieldName(k)}: ${v}`).join(", ");
      }
      return `${entries.length} fields`;
    } catch {
      return String(value);
    }
  }
  const str = String(value);
  return str.length > 60 ? str.substring(0, 57) + "…" : str;
}

export function canRevertLog(log: { action_type: string; metadata: Record<string, unknown> | null }): boolean {
  const category = categorizeAction(log.action_type);
  if (category !== "updated") return false;
  
  const metadata = log.metadata;
  if (!metadata) return false;
  
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
    const { error } = await supabase
      .from(tableName as "users")
      .update(oldValues)
      .eq("id", log.entity_id);

    if (error) throw error;

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
  const headers = ["Timestamp", "User", "Action", "Module", "Record", "Changes", "IP Address"];
  
  const rows = logs.map((log) => [
    log.createdAt || "",
    log.userName || log.userEmail || "System",
    log.actionType,
    MODULE_DISPLAY_NAMES[log.entityType || ""] || log.entityType || "",
    log.entityName || log.entityId || "",
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

// Batch resolve UUIDs from audit logs metadata to human-readable names
export async function resolveUUIDsFromLogs(
  logs: ParsedAuditLog[]
): Promise<Map<string, string>> {
  const uuids = new Set<string>();

  logs.forEach((log) => {
    if (!log.metadata) return;
    // Collect UUIDs from metadata values
    Object.values(log.metadata).forEach((val) => {
      if (typeof val === "string" && isUUID(val)) {
        uuids.add(val);
      }
    });
    // Collect from changes
    log.changes.forEach((change) => {
      if (typeof change.oldValue === "string" && isUUID(change.oldValue)) uuids.add(change.oldValue);
      if (typeof change.newValue === "string" && isUUID(change.newValue)) uuids.add(change.newValue);
    });
  });

  if (uuids.size === 0) return new Map();

  const uuidArray = [...uuids];
  const nameMap = new Map<string, string>();

  // Try to resolve from users table (auth_user_id and id)
  const { data: usersByAuth } = await supabase
    .from("users")
    .select("auth_user_id, id, name, email")
    .in("auth_user_id", uuidArray);

  if (usersByAuth) {
    usersByAuth.forEach((u) => {
      const displayName = u.name || u.email;
      if (u.auth_user_id) nameMap.set(u.auth_user_id, displayName);
      if (u.id) nameMap.set(u.id, displayName);
    });
  }

  // Also try by id for remaining UUIDs
  const remaining = uuidArray.filter((id) => !nameMap.has(id));
  if (remaining.length > 0) {
    const { data: usersById } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", remaining);

    if (usersById) {
      usersById.forEach((u) => {
        const displayName = u.name || u.email;
        if (u.id) nameMap.set(u.id, displayName);
      });
    }
  }

  return nameMap;
}

/**
 * Extract user identity from audit log metadata when user_id is null
 * (common with trigger-based audit logs where auth.uid() is null)
 */
export function extractUserFromMetadata(
  metadata: Record<string, unknown> | null,
  entityType: string | null,
  uuidNameMap?: Map<string, string>
): { name: string | null; email: string | null } {
  if (!metadata) return { name: null, email: null };

  // Direct metadata fields
  if (metadata.target_email) return { name: null, email: String(metadata.target_email) };
  if (metadata.email) return { name: null, email: String(metadata.email) };

  // For user entity updates, extract from new_values or old_values
  if (entityType === "users") {
    const newVals = metadata.new_values as Record<string, unknown> | undefined;
    const oldVals = metadata.old_values as Record<string, unknown> | undefined;
    const vals = newVals || oldVals;
    if (vals) {
      const name = vals.name ? String(vals.name) : null;
      const email = vals.email ? String(vals.email) : null;
      if (name || email) return { name, email };
    }
  }

  // Try resolving assigned_by or other UUID fields
  const uuidFields = ["assigned_by", "assigned_to", "reset_by", "created_by"];
  for (const field of uuidFields) {
    const val = metadata[field];
    if (typeof val === "string" && isUUID(val) && uuidNameMap?.has(val)) {
      return { name: uuidNameMap.get(val)!, email: null };
    }
  }

  return { name: null, email: null };
}

/**
 * Generate a compact one-line summary for a log entry (used in table rows).
 * Full details are shown in the Eye dialog.
 */
export function summarizeLogChanges(
  log: ParsedAuditLog,
  uuidNameMap?: Map<string, string>
): string {
  const meta = log.metadata;

  // For login/logout, just show the action
  if (log.actionCategory === "login") return "User logged in";
  if (log.actionCategory === "logout") return "User logged out";
  if (log.actionCategory === "password_reset") return "Password was reset";

  // For created: show identifying info
  if (log.actionCategory === "created") {
    const name = log.entityName || (meta?.email as string) || (meta?.name as string) || (meta?.title as string);
    if (name && typeof name === "string" && !isUUID(name)) return name;
    return `${MODULE_DISPLAY_NAMES[log.entityType || ""] || log.entityType || "Record"} created`;
  }

  // For deleted
  if (log.actionCategory === "deleted" || log.actionCategory === "bulk_deleted") {
    const name = log.entityName;
    if (name && !isUUID(name)) return name;
    return `${MODULE_DISPLAY_NAMES[log.entityType || ""] || log.entityType || "Record"} deleted`;
  }

  // For assigned
  if (log.actionCategory === "assigned") {
    const toolName = meta?.tool_name as string;
    if (toolName) return `Tool: ${toolName}`;
    return "Assignment changed";
  }

  // For updated: list meaningful changed field names
  if (log.changes.length > 0) {
    const meaningfulChanges = log.changes.filter(
      (c) => !NOISE_CHANGE_FIELDS.has(c.field.toLowerCase().replace(/ /g, "_"))
    );
    const fields = meaningfulChanges.length > 0 ? meaningfulChanges : log.changes;
    const fieldNames = fields.slice(0, 3).map((c) => c.field);
    const summary = fieldNames.join(", ") + " changed";
    return summary.length > 80 ? summary.substring(0, 77) + "…" : summary;
  }

  // Fallback
  if (log.entityName && !isUUID(log.entityName)) return log.entityName;
  return log.actionType;
}

/**
 * Detect if a log is really just a login session (only last_login/updated_at changed)
 */
export function isLoginNoiseLog(log: {
  action_type: string;
  entity_type: string | null;
  metadata: Record<string, unknown> | null;
}): boolean {
  if (log.entity_type !== "users") return false;
  const category = categorizeAction(log.action_type);
  if (category !== "updated") return false;

  const meta = log.metadata;
  if (!meta?.old_values || !meta?.new_values) return false;

  const oldValues = meta.old_values as Record<string, unknown>;
  const newValues = meta.new_values as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
  const changedKeys = [...allKeys].filter((k) => oldValues[k] !== newValues[k]);

  // If only last_login and/or updated_at changed, it's login noise
  return changedKeys.every((k) => k === "last_login" || k === "updated_at");
}
