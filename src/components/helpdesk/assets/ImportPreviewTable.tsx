import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2, Upload, X, CirclePlus, RefreshCw } from "lucide-react";
import type { ValidatedRow } from "@/hooks/useAssetExportImport";

interface ImportPreviewTableProps {
  validatedRows: ValidatedRow[];
  totalRows: number;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting: boolean;
}

export function ImportPreviewTable({
  validatedRows,
  totalRows,
  onConfirm,
  onCancel,
  isImporting,
}: ImportPreviewTableProps) {
  if (validatedRows.length === 0) return null;

  const previewRows = validatedRows.slice(0, 10);
  const headers = Object.keys(validatedRows[0]?.raw || {});
  const mappedColumns = validatedRows[0]?.mappedColumns || [];
  const unmappedColumns = validatedRows[0]?.unmappedColumns || [];

  const newCount = validatedRows.filter((r) => r.status === "new").length;
  const updateCount = validatedRows.filter((r) => r.status === "update").length;
  const errorCount = validatedRows.filter((r) => r.status === "error").length;

  const statusBadge = (status: ValidatedRow["status"]) => {
    switch (status) {
      case "new":
        return <Badge variant="default" className="text-[10px] h-4 px-1.5 gap-0.5"><CirclePlus className="h-2.5 w-2.5" />New</Badge>;
      case "update":
        return <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5"><RefreshCw className="h-2.5 w-2.5" />Update</Badge>;
      case "error":
        return <Badge variant="destructive" className="text-[10px] h-4 px-1.5 gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />Error</Badge>;
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      {/* Summary row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-xs font-medium">{totalRows} rows</Badge>
          {newCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1"><CirclePlus className="h-3 w-3 text-primary" />{newCount} new</Badge>
          )}
          {updateCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1"><RefreshCw className="h-3 w-3 text-muted-foreground" />{updateCount} updates</Badge>
          )}
          {errorCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30"><AlertTriangle className="h-3 w-3" />{errorCount} errors</Badge>
          )}
        </div>
        <Badge variant="outline" className="text-[10px]">
          Previewing first {previewRows.length}
        </Badge>
      </div>

      {/* Column mapping status */}
      {unmappedColumns.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Unrecognized columns:</span>{" "}
            <span className="text-muted-foreground">{unmappedColumns.join(", ")}</span>
            <span className="text-muted-foreground"> — these will be ignored during import.</span>
          </div>
        </div>
      )}

      {/* Data preview table */}
      <ScrollArea className="rounded-md border">
        <div className="max-h-[260px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-xs">#</TableHead>
                <TableHead className="w-16 text-xs">Status</TableHead>
                {headers.map((h) => (
                  <TableHead key={h} className="text-xs whitespace-nowrap min-w-[100px]">
                    <span className="flex items-center gap-1">
                      {mappedColumns.includes(h) ? (
                        <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                      )}
                      {h}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((vr) => (
                <TableRow key={vr.rowNum}>
                  <TableCell className="text-xs text-muted-foreground font-mono">{vr.rowNum - 1}</TableCell>
                  <TableCell className="text-xs">{statusBadge(vr.status)}</TableCell>
                  {headers.map((h) => (
                    <TableCell
                      key={h}
                      className={`text-xs truncate max-w-[180px] ${
                        vr.status === "error" && !vr.raw[h]?.trim() ? "text-destructive bg-destructive/5" : ""
                      }`}
                    >
                      {vr.raw[h] || <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={onConfirm} disabled={isImporting || errorCount === totalRows}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Import {totalRows - errorCount} Rows
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isImporting}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
