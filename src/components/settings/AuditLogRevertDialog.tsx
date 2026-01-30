import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Undo2, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { revertAuditLog, ParsedAuditLog, MODULE_DISPLAY_NAMES, formatChangeValue } from "@/lib/auditLogUtils";
import { useAuth } from "@/contexts/AuthContext";

interface AuditLogRevertDialogProps {
  log: ParsedAuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReverted: () => void;
}

export function AuditLogRevertDialog({
  log,
  open,
  onOpenChange,
  onReverted,
}: AuditLogRevertDialogProps) {
  const [isReverting, setIsReverting] = useState(false);
  const { user } = useAuth();

  if (!log) return null;

  const handleRevert = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to revert changes");
      return;
    }

    setIsReverting(true);
    try {
      const result = await revertAuditLog(
        {
          id: log.id,
          entity_type: log.entityType,
          entity_id: log.entityId,
          metadata: log.metadata,
        },
        user.id
      );

      if (result.success) {
        toast.success("Changes reverted successfully");
        onReverted();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to revert changes");
      }
    } catch (error) {
      toast.error("An error occurred while reverting");
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-amber-500" />
            Revert Changes
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to revert this change? This will restore the record
                to its previous state.
              </p>

              {/* Record Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Module:</span>
                  <Badge variant="outline">
                    {MODULE_DISPLAY_NAMES[log.entityType || ""] || log.entityType}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Record ID:</span>
                  <code className="text-sm font-mono bg-background px-2 py-0.5 rounded">
                    {log.entityId?.slice(0, 12)}...
                  </code>
                </div>
              </div>

              {/* Changes to Revert */}
              {log.changes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Changes to be reverted:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {log.changes.slice(0, 5).map((change, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm bg-muted/30 rounded px-3 py-2"
                      >
                        <span className="font-medium text-primary">{change.field}:</span>
                        <span className="text-green-600 dark:text-green-400">
                          {formatChangeValue(change.newValue)}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-amber-600 dark:text-amber-400">
                          {formatChangeValue(change.oldValue)}
                        </span>
                      </div>
                    ))}
                    {log.changes.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{log.changes.length - 5} more changes
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  This action will create a new audit log entry and cannot be undone without
                  another revert.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isReverting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevert}
            disabled={isReverting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isReverting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reverting...
              </>
            ) : (
              <>
                <Undo2 className="h-4 w-4 mr-2" />
                Revert Changes
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
