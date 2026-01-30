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
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Trash2,
  AlertTriangle,
  UserPlus,
  LogIn,
  LogOut,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import {
  ParsedAuditLog,
  ACTION_BADGE_CONFIG,
  MODULE_DISPLAY_NAMES,
  formatChangeValue,
} from "@/lib/auditLogUtils";

interface AuditLogDetailsDialogProps {
  log: ParsedAuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <PlusCircle className="h-4 w-4" />,
  updated: <RefreshCw className="h-4 w-4" />,
  deleted: <Trash2 className="h-4 w-4" />,
  bulk_deleted: <AlertTriangle className="h-4 w-4" />,
  assigned: <UserPlus className="h-4 w-4" />,
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  other: <Activity className="h-4 w-4" />,
};

export function AuditLogDetailsDialog({ log, open, onOpenChange }: AuditLogDetailsDialogProps) {
  if (!log) return null;

  const badgeConfig = ACTION_BADGE_CONFIG[log.actionCategory] || ACTION_BADGE_CONFIG.other;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

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
                {log.entityId && ` • ${log.entityId.slice(0, 8)}...`}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Timestamp and User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Timestamp</span>
                </div>
                <p className="text-sm font-medium">
                  {log.createdAt
                    ? format(new Date(log.createdAt), "MMMM d, yyyy 'at' HH:mm:ss")
                    : "Unknown"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Performed By</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{log.userName || "System"}</p>
                  {log.userEmail && (
                    <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Entity Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Record Information</h4>
              <div className="grid grid-cols-2 gap-4 bg-muted/50 rounded-lg p-4">
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
                  <p className="text-sm font-mono">{log.entityId || "—"}</p>
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
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Changes Made</h4>
                  <div className="space-y-2">
                    {log.changes.map((change, index) => (
                      <div
                        key={index}
                        className="bg-muted/50 rounded-lg p-3 space-y-2"
                      >
                        <p className="text-sm font-medium text-primary">{change.field}</p>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="flex-1 bg-red-50 dark:bg-red-950/30 rounded px-3 py-1.5 border border-red-200 dark:border-red-900">
                            <p className="text-xs text-red-600 dark:text-red-400 mb-0.5">Before</p>
                            <p className="text-red-700 dark:text-red-300 break-all">
                              {formatChangeValue(change.oldValue)}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 bg-green-50 dark:bg-green-950/30 rounded px-3 py-1.5 border border-green-200 dark:border-green-900">
                            <p className="text-xs text-green-600 dark:text-green-400 mb-0.5">After</p>
                            <p className="text-green-700 dark:text-green-300 break-all">
                              {formatChangeValue(change.newValue)}
                            </p>
                          </div>
                        </div>
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
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Technical Details</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    {log.ipAddress && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">IP Address:</span>
                        <code className="text-sm font-mono bg-background px-2 py-0.5 rounded">
                          {log.ipAddress}
                        </code>
                      </div>
                    )}
                    {log.userAgent && (
                      <div className="flex items-start gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="text-sm">User Agent:</span>
                          <p className="text-xs text-muted-foreground mt-1 break-all">
                            {log.userAgent}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Raw Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Raw Metadata</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(JSON.stringify(log.metadata, null, 2), "Metadata")
                      }
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy JSON
                    </Button>
                  </div>
                  <pre className="text-xs bg-muted/50 rounded-lg p-4 overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
