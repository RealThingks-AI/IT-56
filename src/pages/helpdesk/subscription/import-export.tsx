import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSubscriptionImportExport, parseFileToRows, validateRows, type ValidatedSubRow } from "@/hooks/subscriptions/useSubscriptionImportExport";

const FIELD_MAPPING = [
  { excel: "Asset Name / Name", db: "tool_name", required: true },
  { excel: "Category", db: "category", required: true },
  { excel: "Sub Type", db: "subscription_type", required: true },
  { excel: "Quantity", db: "quantity", required: false },
  { excel: "Seats / Licenses", db: "license_count", required: false },
  { excel: "Unit Cost", db: "unit_cost", required: false },
  { excel: "Currency", db: "currency", required: false },
  { excel: "Total Cost", db: "total_cost", required: false },
  { excel: "Vendor", db: "vendor (matched by name)", required: false },
  { excel: "Department", db: "department", required: false },
  { excel: "Purchase Date", db: "purchase_date", required: false },
  { excel: "Renewal Date", db: "renewal_date", required: false },
  { excel: "Next Payment Date", db: "next_payment_date", required: false },
  { excel: "Contract Start", db: "contract_start_date", required: false },
  { excel: "Contract End", db: "contract_end_date", required: false },
  { excel: "Status", db: "status", required: false },
  { excel: "Notes", db: "notes", required: false },
  { excel: "Owner", db: "owner_name", required: false },
];

export default function SubscriptionImportExport() {
  const {
    isExporting,
    importProgress,
    exportSubscriptions,
    importSubscriptions,
    downloadTemplate,
  } = useSubscriptionImportExport();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ValidatedSubRow[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);
  const [phase, setPhase] = useState<"idle" | "preview" | "importing" | "done">("idle");

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseFileToRows(file);
      setRawRows(rows);
      setPreview(await validateRows(rows));
      setPhase("preview");
    } catch {
      setPhase("idle");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    setPhase("importing");
    const errors = await importSubscriptions(rawRows);
    setImportErrors(errors);
    setPhase("done");
  };

  const newCount = preview.filter((row) => row.status === "new").length;
  const updateCount = preview.filter((row) => row.status === "update").length;
  const errorCount = preview.filter((row) => row.status === "error").length;

  return (
    <ScrollArea className="h-full">
      <div className="animate-in fade-in space-y-4 p-4 duration-300">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4" /> Export Subscriptions
              </CardTitle>
              <CardDescription className="text-xs">Download all subscriptions as an Excel file</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={exportSubscriptions} disabled={isExporting} className="w-full gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {isExporting ? "Exporting..." : "Export to Excel"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4" /> Import Subscriptions
              </CardTitle>
              <CardDescription className="text-xs">Upload a file using the streamlined subscription field model</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2">
                  <Upload className="h-4 w-4" /> Select File
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>Template</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {phase === "idle" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Field Mapping</CardTitle>
              <CardDescription className="text-xs">How Excel columns map to the simplified subscription schema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-8 text-xs font-medium">EXCEL COLUMN</TableHead>
                      <TableHead className="h-8 text-xs font-medium" />
                      <TableHead className="h-8 text-xs font-medium">DATABASE FIELD</TableHead>
                      <TableHead className="h-8 text-xs font-medium">REQUIRED</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {FIELD_MAPPING.map((field) => (
                      <TableRow key={field.db} className="hover:bg-muted/50">
                        <TableCell className="py-1.5 text-xs font-medium">{field.excel}</TableCell>
                        <TableCell className="py-1.5"><ArrowRight className="h-3 w-3 text-muted-foreground" /></TableCell>
                        <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">{field.db}</TableCell>
                        <TableCell className="py-1.5">
                          {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === "preview" && preview.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Import Preview</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{newCount} new</Badge>
                  <Badge variant="outline">{updateCount} updates</Badge>
                  {errorCount > 0 && <Badge variant="destructive">{errorCount} errors</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[400px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-xs">ROW</TableHead>
                      <TableHead className="h-8 text-xs">STATUS</TableHead>
                      <TableHead className="h-8 text-xs">NAME</TableHead>
                      <TableHead className="h-8 text-xs">CATEGORY</TableHead>
                      <TableHead className="h-8 text-xs">TYPE</TableHead>
                      <TableHead className="h-8 text-xs">ERROR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 50).map((row) => (
                      <TableRow key={row.rowNum}>
                        <TableCell className="py-1.5 text-xs">{row.rowNum}</TableCell>
                        <TableCell className="py-1.5">
                          <Badge
                            variant={row.status === "error" ? "destructive" : row.status === "update" ? "outline" : "secondary"}
                            className="text-xs"
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-xs">{row.raw["Asset Name"] || row.raw["Name"] || "—"}</TableCell>
                        <TableCell className="py-1.5 text-xs">{row.raw["Category"] || "—"}</TableCell>
                        <TableCell className="py-1.5 text-xs">{row.raw["Sub Type"] || "—"}</TableCell>
                        <TableCell className="py-1.5 text-xs text-destructive">{row.error || ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setPhase("idle"); setPreview([]); }}>Cancel</Button>
                <Button onClick={handleImport} disabled={errorCount === preview.length}>
                  Import {newCount + updateCount} Subscriptions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === "importing" && (
          <Card>
            <CardContent className="space-y-3 py-6">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
                <span className="text-sm">Importing... {importProgress.current}/{importProgress.total}</span>
              </div>
              <Progress value={(importProgress.current / Math.max(importProgress.total, 1)) * 100} />
            </CardContent>
          </Card>
        )}

        {phase === "done" && (
          <Card>
            <CardContent className="py-6">
              <div className="mb-2 flex items-center gap-2">
                {importErrors.length === 0 ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Import completed successfully</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium">Import completed with {importErrors.length} errors</span>
                  </>
                )}
              </div>
              {importErrors.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {importErrors.slice(0, 10).map((error, index) => <div key={index}>Row {error.row}: {error.error}</div>)}
                  {importErrors.length > 10 && <div>...and {importErrors.length - 10} more</div>}
                </div>
              )}
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setPhase("idle"); setImportErrors([]); setPreview([]); }}>
                Done
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
