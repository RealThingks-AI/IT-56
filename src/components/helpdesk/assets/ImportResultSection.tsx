import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface ImportResultSectionProps {
  result: { success: number; errors: any[] };
  errors: { row: number; error: string }[];
  onClear: () => void;
}

export function ImportResultSection({ result, errors, onClear }: ImportResultSectionProps) {
  return (
    <div className="space-y-3 pt-3 border-t animate-in fade-in-0 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-primary">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">{result.success} imported</span>
          </div>
          {result.errors.length > 0 && (
            <div className="flex items-center gap-1.5 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{result.errors.length} errors</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>Clear</Button>
      </div>
      {errors.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Error Log
          </div>
          <ScrollArea className="h-40 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-xs">Row</TableHead>
                  <TableHead className="text-xs">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((err, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-[11px]">{err.row}</TableCell>
                    <TableCell className="text-[11px] text-destructive">{err.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
