import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, User, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useUsersLookup } from "@/hooks/useUsersLookup";

interface EventsTabProps {
  assetId: string;
}

const LIFECYCLE_EVENTS = [
  "created", "checked_out", "checked_in", "status_changed",
  "transferred", "maintenance", "repair", "disposed",
  "lost", "found", "replicated", "reassigned", "returned_to_stock",
  "sent_for_repair", "repair_completed", "repair_cancelled", "marked_as_lost",
];

const PAGE_SIZE = 50;

interface ChangeEntry { field: string; old: string | null; new: string | null; }
interface HistoryEvent {
  id: string; action: string; old_value: string | null; new_value: string | null;
  details: any; created_at: string | null; performed_by: string | null;
}

export const EventsTab = ({ assetId }: EventsTabProps) => {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { resolveUserName } = useUsersLookup();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["asset-events", assetId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_asset_history")
        .select("*")
        .eq("asset_id", assetId)
        .in("action", LIFECYCLE_EVENTS)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as HistoryEvent[];
    },
    enabled: !!assetId,
  });

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const HIDDEN_DETAIL_KEYS = new Set([
    'checkout_type', 'user_id', 'location_id', 'department_id',
    'field', 'old', 'new', 'asset_id', 'previous_status', 'new_status',
    'category_id', 'vendor_id', 'make_id',
  ]);
  const PRIORITY_KEYS = ['notes', 'location', 'department', 'assigned_to', 'checked_out_to'];

  const resolveDetailValue = (key: string, value: any): string => {
    if (typeof value === 'string' && UUID_REGEX.test(value)) {
      const resolved = resolveUserName(value);
      if (resolved) return resolved;
    }
    return String(value);
  };

  const isDateKey = (key: string) =>
    key.includes('date') || key.includes('return') || key.endsWith('_at');

  const sortDetailEntries = (entries: [string, any][]) =>
    entries.sort((a, b) => {
      const ai = PRIORITY_KEYS.indexOf(a[0]);
      const bi = PRIORITY_KEYS.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });

  const actionColors: Record<string, string> = {
    created: "bg-green-100 text-green-800",
    field_updated: "bg-sky-100 text-sky-800",
    fields_updated: "bg-sky-100 text-sky-800",
    checked_out: "bg-purple-100 text-purple-800",
    checked_in: "bg-teal-100 text-teal-800",
    status_changed: "bg-amber-100 text-amber-800",
    transferred: "bg-blue-100 text-blue-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    repair: "bg-orange-100 text-orange-800",
    sent_for_repair: "bg-rose-100 text-rose-800",
    repair_completed: "bg-green-100 text-green-800",
    repair_cancelled: "bg-gray-100 text-gray-800",
    disposed: "bg-red-100 text-red-800",
    lost: "bg-red-100 text-red-800",
    marked_as_lost: "bg-orange-100 text-orange-800",
    found: "bg-green-100 text-green-800",
    replicated: "bg-indigo-100 text-indigo-800",
    reassigned: "bg-cyan-100 text-cyan-800",
    returned_to_stock: "bg-emerald-100 text-emerald-800",
  };

  const getChanges = (event: HistoryEvent): ChangeEntry[] | null => {
    if (event.action === "fields_updated" && event.details?.changes && Array.isArray(event.details.changes)) {
      return event.details.changes;
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
            <TableCell className="text-xs text-muted-foreground">{change.old || "—"}</TableCell>
            <TableCell className="text-xs font-medium">{change.new || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <div className="text-center py-6">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No lifecycle events recorded</p>
          <p className="text-xs text-muted-foreground mt-1">
            Events like check-in/out, transfers, and status changes appear here
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{events.length} event{events.length !== 1 ? "s" : ""}</p>
          <div className="space-y-1">
            {events.map((event) => {
              const performedByName = resolveUserName(event.performed_by);
              const changes = getChanges(event);
              return (
                <div key={event.id} className="px-3 py-2 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${actionColors[event.action] || "bg-gray-100 text-gray-800"} text-xs`}>
                        {event.action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </Badge>
                      {event.action === "fields_updated" && (() => {
                        const ch = getChanges(event);
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
                      {event.old_value && event.new_value && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="truncate max-w-[200px]">{event.old_value}</span>
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[200px] text-foreground">{event.new_value}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{performedByName || "Unknown"}</span>
                      {event.created_at && (
                        <span>{format(new Date(event.created_at), "dd MMM yyyy, HH:mm")}</span>
                      )}
                    </div>
                  </div>

                  {changes ? (
                    renderChangesTable(changes)
                  ) : (
                    event.details && typeof event.details === 'object' && !event.details.changes && (() => {
                      const filtered = sortDetailEntries(
                        Object.entries(event.details as Record<string, any>)
                          .filter(([key, value]) => !HIDDEN_DETAIL_KEYS.has(key) && value !== null && value !== undefined && value !== '')
                      );
                      if (filtered.length === 0) return null;
                      return (
                        <dl className="border-t border-border/50 mt-2 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                          {filtered.map(([key, value]) => {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
                    })()
                  )}
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {events.length >= limit && (
            <div className="text-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Load more events
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
