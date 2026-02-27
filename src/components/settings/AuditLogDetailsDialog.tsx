import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  User,
  Clock,
  Globe,
  Monitor,
  ArrowRight,
  Copy,
  PlusCircle,
  RefreshCw,
  Trash2,
  AlertTriangle,
  UserPlus,
  LogIn,
  LogOut,
  Activity,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  ParsedAuditLog,
  ACTION_BADGE_CONFIG,
  MODULE_DISPLAY_NAMES,
  formatChangeValue,
  formatFieldName,
  isUUID,
} from "@/lib/auditLogUtils";

interface AuditLogDetailsDialogProps {
  log: ParsedAuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uuidNameMap?: Map<string, string>;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <PlusCircle className="h-4 w-4" />,
  updated: <RefreshCw className="h-4 w-4" />,
  deleted: <Trash2 className="h-4 w-4" />,
  bulk_deleted: <AlertTriangle className="h-4 w-4" />,
  assigned: <UserPlus className="h-4 w-4" />,
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  password_reset: <KeyRound className="h-4 w-4" />,
  other: <Activity className="h-4 w-4" />,
};

// Fields to hide in detail view (internal/system)
const HIDDEN_DETAIL_KEYS = new Set([
  "id", "user_id", "created_at", "updated_at", "tenant_id",
  "old_values", "new_values", "changes", "ip_address", "user_agent",
  "auth_user_id", "is_first_user",
]);

export function AuditLogDetailsDialog({ log, open, onOpenChange, uuidNameMap }: AuditLogDetailsDialogProps) {
  if (!log) return null;

  const badgeConfig = ACTION_BADGE_CONFIG[log.actionCategory] || ACTION_BADGE_CONFIG.other;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Format metadata for display: show human-readable key-value pairs
  const displayMetadata = log.metadata
    ? Object.entries(log.metadata)
        .filter(([key]) => !HIDDEN_DETAIL_KEYS.has(key))
        .map(([key, value]) => ({
          label: formatFieldName(key),
          value: formatDetailValue(value, uuidNameMap),
        }))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Audit Log Details</span>
            <Badge variant="outline" className={`${badgeConfig.className} border`}>
              {ACTION_ICONS[log.actionCategory]}
              <span className="ml-1.5">{badgeConfig.label}</span>
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {log.entityType && (
              <>
                {MODULE_DISPLAY_NAMES[log.entityType] || log.entityType}
                {log.entityName && ` · ${log.entityName}`}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5">
            {/* Timestamp and User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Timestamp</span>
                </div>
                <p className="text-sm font-medium">
                  {log.createdAt
                    ? format(new Date(log.createdAt), "MMMM d, yyyy 'at' HH:mm:ss")
                    : "Unknown"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>Performed By</span>
                </div>
                <p className="text-sm font-medium">{log.userName || "System"}</p>
                {log.userEmail && (
                  <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Record Information */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Record Information</h4>
              <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-lg p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Module</p>
                  <p className="text-sm font-medium">
                    {MODULE_DISPLAY_NAMES[log.entityType || ""] || log.entityType || "—"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Record ID</p>
                    {log.entityId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => copyToClipboard(log.entityId!, "Record ID")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm font-mono text-xs">
                    {log.entityId
                      ? (uuidNameMap?.get(log.entityId) || log.entityId.slice(0, 12) + "…")
                      : "—"}
                  </p>
                </div>
                {log.entityName && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Record Name</p>
                    <p className="text-sm font-medium">{log.entityName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Changes */}
            {log.changes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Changes Made</h4>
                  <div className="space-y-1.5">
                    {log.changes.map((change, index) => (
                      <div
                        key={index}
                        className="bg-muted/50 rounded-lg p-2.5 flex items-center gap-3"
                      >
                        <span className="text-xs font-medium text-primary min-w-[100px]">{change.field}</span>
                        <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
                          {change.oldValue !== null && (
                            <>
                              <span className="bg-red-50 dark:bg-red-950/30 rounded px-2 py-0.5 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 truncate max-w-[180px]">
                                {formatChangeValue(change.oldValue, uuidNameMap)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            </>
                          )}
                          <span className="bg-green-50 dark:bg-green-950/30 rounded px-2 py-0.5 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300 truncate max-w-[180px]">
                            {formatChangeValue(change.newValue, uuidNameMap)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Metadata Details */}
            {displayMetadata.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Additional Details</h4>
                  <div className="bg-muted/50 rounded-lg divide-y divide-border">
                    {displayMetadata.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 px-3 py-2">
                        <span className="text-xs text-muted-foreground min-w-[120px] shrink-0">{item.label}</span>
                        <span className="text-xs break-all">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Technical Details */}
            {(log.ipAddress || log.userAgent) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Technical Details</h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {log.ipAddress && (
                      <div className="flex items-center gap-2 text-xs">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">IP:</span>
                        <code className="font-mono bg-background px-1.5 py-0.5 rounded text-xs">
                          {log.ipAddress}
                        </code>
                      </div>
                    )}
                    {log.userAgent && (
                      <div className="flex items-start gap-2 text-xs">
                        <Monitor className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground">Agent:</span>
                        <span className="text-xs text-muted-foreground break-all">
                          {log.userAgent}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function formatDetailValue(value: unknown, uuidNameMap?: Map<string, string>): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    if (isUUID(value) && uuidNameMap?.has(value)) return uuidNameMap.get(value)!;
    return value;
  }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(v => formatDetailValue(v, uuidNameMap)).join(", ");
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.map(([k, v]) => `${formatFieldName(k)}: ${formatDetailValue(v, uuidNameMap)}`).join(", ");
  }
  return String(value);
}
