import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { History, User, ArrowRight, Loader2 } from "lucide-react";
import { useUsersLookup } from "@/hooks/useUsersLookup";

interface HistoryTabProps {
  assetId: string;
}

interface ChangeEntry { field: string; old: string | null; new: string | null; }
interface HistoryDetails { changes?: ChangeEntry[]; [key: string]: any; }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-800",
  updated: "bg-blue-100 text-blue-800",
  field_updated: "bg-sky-100 text-sky-800",
  fields_updated: "bg-sky-100 text-sky-800",
  checked_out: "bg-purple-100 text-purple-800",
  checked_in: "bg-teal-100 text-teal-800",
  status_changed: "bg-amber-100 text-amber-800",
  deleted: "bg-red-100 text-red-800",
  replicated: "bg-indigo-100 text-indigo-800",
  audit_recorded: "bg-orange-100 text-orange-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  repair: "bg-rose-100 text-rose-800",
  sent_for_repair: "bg-rose-100 text-rose-800",
  repair_completed: "bg-green-100 text-green-800",
  repair_cancelled: "bg-gray-100 text-gray-800",
  reassigned: "bg-cyan-100 text-cyan-800",
  returned_to_stock: "bg-emerald-100 text-emerald-800",
  disposed: "bg-red-100 text-red-800",
  lost: "bg-orange-100 text-orange-800",
  marked_as_lost: "bg-orange-100 text-orange-800",
  found: "bg-green-100 text-green-800",
  transferred: "bg-blue-100 text-blue-800",
};

const HIDDEN_DETAIL_KEYS = new Set([
  'checkout_type', 'changes', 'user_id', 'location_id', 'department_id',
  'field', 'old', 'new', 'asset_id', 'previous_status', 'new_status',
  'category_id', 'vendor_id', 'make_id',
]);

const PRIORITY_KEYS = ['notes', 'location', 'department', 'assigned_to', 'checked_out_to'];

const formatLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const isDateKey = (key: string) =>
  key.includes('date') || key.includes('return') || key.endsWith('_at');

function processHistory(items: any[]): any[] {
  const result: any[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (item.action === "fields_updated") { result.push(item); i++; continue; }
    if (item.action === "field_updated") {
      const group: any[] = [item];
      const baseTime = new Date(item.created_at).getTime();
      let j = i + 1;
      while (j < items.length && items[j].action === "field_updated") {
        if (Math.abs(new Date(items[j].created_at).getTime() - baseTime) <= 2000) { group.push(items[j]); j++; } else break;
      }
      if (group.length > 1) {
        const changes: ChangeEntry[] = group.map((g) => {
          const d = g.details as HistoryDetails | null;
          return { field: d?.field || "Unknown", old: d?.old ?? g.old_value ?? null, new: d?.new ?? g.new_value ?? null };
        });
        result.push({ ...item, action: "fields_updated", details: { changes } });
      } else { result.push(item); }
      i = j; continue;
    }
    result.push(item); i++;
  }
  return result;
}

export const HistoryTab = ({ assetId }: HistoryTabProps) => {
  const navigate = useNavigate();
  const { users, resolveUserName } = useUsersLookup();

  const { data: history, isLoading } = useQuery({
    queryKey: ["asset-history", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_asset_history")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!assetId,
  });

  const resolveDetailValue = (key: string, value: any): string => {
    if (typeof value === 'string' && UUID_REGEX.test(value)) {
      const resolved = resolveUserName(value);
      if (resolved) return resolved;
    }
    return String(value);
  };

  const resolveValue = (value: any): string => {
    if (value == null) return "";
    const str = String(value);
    if (UUID_REGEX.test(str)) { const name = resolveUserName(str); if (name) return name; }
    return str;
  };

  const renderClickableValue = (value: any) => {
    if (value == null) return "—";
    const str = String(value);
    if (UUID_REGEX.test(str)) {
      const name = resolveUserName(str);
      if (name) {
        return (
          <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/employees?user=${str}`); }}>{name}</span>
        );
      }
    }
    return resolveValue(value) || "—";
  };

  const sortDetailEntries = (entries: [string, any][]) =>
    entries.sort((a, b) => {
      const ai = PRIORITY_KEYS.indexOf(a[0]);
      const bi = PRIORITY_KEYS.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });

  const getChanges = (item: any): ChangeEntry[] | null => {
    const details = item.details as HistoryDetails | null;
    const action: string = item.action;
    if ((action === "fields_updated" || action === "field_updated") && details?.changes && Array.isArray(details.changes)) return details.changes;
    if (action === "field_updated") {
      const field = details?.field || item.field_name || "Field";
      return [{ field, old: details?.old ?? item.old_value ?? null, new: details?.new ?? item.new_value ?? null }];
    }
    return null;
  };

  const renderChangesTable = (changes: ChangeEntry[]) => (
    <Table wrapperClassName="mt-2 border-muted">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Field</TableHead>
          <TableHead>Old Value</TableHead>
          <TableHead>New Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {changes.map((change, idx) => (
          <TableRow key={idx}>
            <TableCell className="font-medium text-xs">{change.field}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{renderClickableValue(change.old)}</TableCell>
            <TableCell className="text-xs font-medium">{renderClickableValue(change.new)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderDetailGrid = (details: Record<string, any>) => {
    const filtered = sortDetailEntries(
      Object.entries(details).filter(([key, value]) => !HIDDEN_DETAIL_KEYS.has(key) && value !== null && value !== undefined && value !== '')
    );
    if (filtered.length === 0) return null;
    return (
      <dl className="border-t border-border/50 mt-2 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
        {filtered.map(([key, value]) => {
          const label = formatLabel(key);
          let displayValue = resolveDetailValue(key, value);
          if (isDateKey(key) && typeof value === 'string') {
            try { displayValue = format(new Date(value), "dd MMM yyyy, HH:mm"); } catch { /* keep */ }
          }
          return (
            <div key={key} className="flex gap-2">
              <dt className="w-[140px] shrink-0 text-muted-foreground">{label}</dt>
              <dd className="text-foreground font-medium truncate">{displayValue}</dd>
            </div>
          );
        })}
      </dl>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6">
        <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No history available for this asset</p>
        <p className="text-xs text-muted-foreground mt-1">
          Field changes, status updates, and lifecycle events appear here
        </p>
      </div>
    );
  }

  const processed = processHistory(history);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{processed.length} entr{processed.length !== 1 ? "ies" : "y"}</p>
      <div className="space-y-1">
        {processed.map((item: any) => {
          const performedByName = resolveUserName(item.performed_by);
          const changes = getChanges(item);

          return (
            <div key={item.id} className="px-3 py-2 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${ACTION_COLORS[item.action] || "bg-gray-100 text-gray-800"} text-xs`}>
                    {formatLabel(item.action)}
                  </Badge>
                  {(item.action === "fields_updated" || item.action === "field_updated") && (() => {
                    const ch = getChanges(item);
                    if (ch && ch.length > 0) {
                      const fieldNames = ch.map(c => c.field).join(", ");
                      const truncated = fieldNames.length > 60 ? fieldNames.slice(0, 57) + "..." : fieldNames;
                      return (
                        <span className="text-xs text-muted-foreground">
                          {ch.length} field{ch.length !== 1 ? "s" : ""} → {truncated}
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {item.old_value && item.new_value && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="truncate max-w-[200px]">{renderClickableValue(item.old_value)}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[200px] text-foreground">{renderClickableValue(item.new_value)}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {item.performed_by ? (
                      <span className="text-primary hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/assets/employees?user=${item.performed_by}`); }}>{performedByName || "Unknown"}</span>
                    ) : "Unknown"}
                  </span>
                  {item.created_at && (
                    <span>{format(new Date(item.created_at), "dd MMM yyyy, HH:mm")}</span>
                  )}
                </div>
              </div>

              {changes ? renderChangesTable(changes) : (
                item.details && typeof item.details === 'object' && !item.details.changes && (
                  renderDetailGrid(item.details as Record<string, any>)
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
