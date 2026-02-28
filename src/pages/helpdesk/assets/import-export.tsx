import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AssetModuleTopBar } from "@/components/helpdesk/assets/AssetModuleTopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Download, Upload, FileSpreadsheet,
  CheckSquare, Square, FileDown, Search,
} from "lucide-react";
import {
  useAssetExportImport, EXPORT_FIELD_GROUPS, IMPORT_FIELD_GROUPS,
  getDefaultSelectedFields, getAllFieldKeys, parseFileToRows, validateRowsForPreview,
} from "@/hooks/useAssetExportImport";
import type { ExportFormat, ValidatedRow } from "@/hooks/useAssetExportImport";
import { FileDropzone } from "@/components/helpdesk/assets/FileDropzone";
import { ImportPreviewTable } from "@/components/helpdesk/assets/ImportPreviewTable";
import { ImportResultSection } from "@/components/helpdesk/assets/ImportResultSection";

export default function ImportExportPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const {
    exportAssets, importAssets, downloadTemplate, resetImportState,
    isExporting, isImporting, importProgress, importPhase, importErrors,
  } = useAssetExportImport();

  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [selectedFields, setSelectedFields] = useState<string[]>(getDefaultSelectedFields());
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; errors: any[] } | null>(null);
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Column reference search
  const [columnSearch, setColumnSearch] = useState("");

  const allFieldKeys = useMemo(() => getAllFieldKeys(), []);
  const allSelected = selectedFields.length === allFieldKeys.length;

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    setSelectedFields((prev) => checked ? [...prev, fieldKey] : prev.filter((f) => f !== fieldKey));
  };

  const handleSelectAll = (groupKey: string, checked: boolean) => {
    const group = EXPORT_FIELD_GROUPS[groupKey as keyof typeof EXPORT_FIELD_GROUPS];
    const fieldKeys = group.fields.map((f) => f.key);
    setSelectedFields((prev) =>
      checked ? [...new Set([...prev, ...fieldKeys])] : prev.filter((f) => !fieldKeys.includes(f))
    );
  };

  const handleMasterToggle = () => setSelectedFields(allSelected ? [] : [...allFieldKeys]);

  const isGroupFullySelected = (groupKey: string) => {
    const group = EXPORT_FIELD_GROUPS[groupKey as keyof typeof EXPORT_FIELD_GROUPS];
    return group.fields.every((f) => selectedFields.includes(f.key));
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) return;
    await exportAssets(selectedFields, exportFormat);
  };

  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportResult(null);
    resetImportState();
    setIsParsing(true);
    try {
      const rows = await parseFileToRows(file);
      if (rows.length > 0) {
        const validated = await validateRowsForPreview(rows);
        setValidatedRows(validated);
      } else {
        setValidatedRows([]);
      }
    } catch (err: any) {
      setValidatedRows(null);
      const { toast } = await import("sonner");
      toast.error(err.message || "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  };

  const handleClearImport = () => {
    setImportFile(null);
    setImportResult(null);
    setValidatedRows(null);
    resetImportState();
  };

  const handleImport = async () => {
    if (!importFile) return;
    const result = await importAssets(importFile);
    setImportResult(result);
    setValidatedRows(null);
  };

  const progressPercent = importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0;

  // Filter import field groups for the "Supported Columns" reference
  const filteredImportGroups = useMemo(() => {
    if (!columnSearch.trim()) return Object.entries(IMPORT_FIELD_GROUPS);
    const q = columnSearch.toLowerCase();
    return Object.entries(IMPORT_FIELD_GROUPS)
      .map(([key, group]) => {
        const filtered = group.fields.filter((f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q));
        return filtered.length > 0 ? [key, { ...group, fields: filtered }] as const : null;
      })
      .filter(Boolean) as unknown as [string, typeof IMPORT_FIELD_GROUPS[keyof typeof IMPORT_FIELD_GROUPS]][];
  }, [columnSearch]);

  return (
    <div className={embedded ? "h-full" : "h-full overflow-auto bg-background"}>
      {!embedded && <AssetModuleTopBar />}
      <div className={embedded ? "space-y-4" : "px-4 py-4 space-y-4 max-w-6xl"}>



        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="export" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Export
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" /> Import
            </TabsTrigger>
          </TabsList>

          {/* ═══════ EXPORT ═══════ */}
          <TabsContent value="export" className="space-y-4 mt-4 animate-in fade-in-0 duration-200">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-medium">Select Fields to Export</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleMasterToggle}>
                      {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      {allSelected ? "Deselect All" : "Select All"}
                    </Button>
                    <Badge variant="secondary" className="text-xs">
                      {selectedFields.length}/{allFieldKeys.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                {Object.entries(EXPORT_FIELD_GROUPS).map(([groupKey, group]) => (
                  <div key={groupKey} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`group-${groupKey}`}
                        checked={isGroupFullySelected(groupKey)}
                        onCheckedChange={(c) => handleSelectAll(groupKey, !!c)}
                      />
                      <Label htmlFor={`group-${groupKey}`} className="text-xs font-medium cursor-pointer">
                        {group.label}
                      </Label>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {group.fields.filter((f) => selectedFields.includes(f.key)).length}/{group.fields.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-1.5 pl-6">
                      {group.fields.map((field) => (
                        <div key={field.key} className="flex items-center gap-1.5">
                          <Checkbox
                            id={field.key}
                            checked={selectedFields.includes(field.key)}
                            onCheckedChange={(c) => handleFieldToggle(field.key, !!c)}
                            className="h-3.5 w-3.5"
                          />
                          <Label htmlFor={field.key} className="text-[11px] cursor-pointer text-muted-foreground leading-tight">
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-3 border-t flex-wrap">
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                    <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">XLSX</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleExport} disabled={isExporting || selectedFields.length === 0}>
                    {isExporting ? "Exporting..." : (
                      <><FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Export {selectedFields.length} Fields</>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">{selectedFields.length} fields selected</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ IMPORT ═══════ */}
          <TabsContent value="import" className="space-y-4 mt-4 animate-in fade-in-0 duration-200">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Import Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Template */}
                <div className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                  <FileDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Download Import Template</p>
                    <p className="text-[11px] text-muted-foreground">Pre-formatted with all 16 importable columns</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => downloadTemplate("xlsx")}>
                      <Download className="h-3 w-3 mr-1" /> XLSX
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => downloadTemplate("csv")}>
                      <Download className="h-3 w-3 mr-1" /> CSV
                    </Button>
                  </div>
                </div>

                <FileDropzone
                  accept=".xlsx,.xls,.csv"
                  file={importFile}
                  onFileSelect={handleFileSelect}
                  onClear={handleClearImport}
                  disabled={isImporting}
                  label="Drop your asset file here or click to browse"
                  description="Supports .xlsx, .xls, .csv"
                />

                {isParsing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Parsing file...
                  </div>
                )}

                {validatedRows && validatedRows.length > 0 && !importResult && (
                  <ImportPreviewTable
                    validatedRows={validatedRows}
                    totalRows={validatedRows.length}
                    onConfirm={handleImport}
                    onCancel={handleClearImport}
                    isImporting={isImporting}
                  />
                )}

                {validatedRows && validatedRows.length === 0 && !isParsing && (
                  <p className="text-xs text-destructive">File is empty or has no data rows.</p>
                )}

                {isImporting && (
                  <div className="space-y-1.5 animate-in fade-in-0 duration-200">
                    <Progress value={progressPercent} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground text-center">
                      {importPhase === "validating"
                        ? `Validating row ${importProgress.current} of ${importProgress.total}`
                        : `Writing ${importProgress.current} of ${importProgress.total} to database`}
                    </p>
                  </div>
                )}

                {importResult && (
                  <ImportResultSection result={importResult} errors={importErrors} onClear={handleClearImport} />
                )}
              </CardContent>
            </Card>

            {/* Supported Columns reference — uses IMPORT fields only */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium">Supported Import Columns</CardTitle>
                  <div className="relative w-40">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search fields..."
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                      className="h-7 text-xs pl-7"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {filteredImportGroups.map(([key, group]) => (
                  <div key={key}>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.fields.map((f) => (
                        <Badge key={f.key} variant="outline" className="text-[10px]">{f.label}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredImportGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground">No matching fields found.</p>
                )}
                {!columnSearch && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    <strong>Required:</strong> Asset Tag ID. All other fields are optional.
                    Category, Brand, Location, Site, Department, and Vendor are <strong>auto-created</strong> if they don't exist.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
