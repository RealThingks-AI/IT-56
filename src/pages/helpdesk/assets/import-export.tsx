import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssetTopBar } from "@/components/helpdesk/assets/AssetTopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileDown
} from "lucide-react";
import { useAssetExportImport, EXPORT_FIELD_GROUPS, getDefaultSelectedFields } from "@/hooks/useAssetExportImport";

export default function ImportExportPage() {
  const navigate = useNavigate();
  const {
    exportAssets,
    importAssets,
    downloadTemplate,
    isExporting,
    isImporting,
    importProgress,
    importErrors,
  } = useAssetExportImport();

  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [selectedFields, setSelectedFields] = useState<string[]>(getDefaultSelectedFields());
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; errors: any[] } | null>(null);

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    if (checked) {
      setSelectedFields((prev) => [...prev, fieldKey]);
    } else {
      setSelectedFields((prev) => prev.filter((f) => f !== fieldKey));
    }
  };

  const handleSelectAll = (groupKey: string, checked: boolean) => {
    const group = EXPORT_FIELD_GROUPS[groupKey as keyof typeof EXPORT_FIELD_GROUPS];
    const fieldKeys = group.fields.map((f) => f.key);
    
    if (checked) {
      setSelectedFields((prev) => [...new Set([...prev, ...fieldKeys])]);
    } else {
      setSelectedFields((prev) => prev.filter((f) => !fieldKeys.includes(f)));
    }
  };

  const isGroupFullySelected = (groupKey: string) => {
    const group = EXPORT_FIELD_GROUPS[groupKey as keyof typeof EXPORT_FIELD_GROUPS];
    return group.fields.every((f) => selectedFields.includes(f.key));
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      return;
    }
    await exportAssets(selectedFields);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    const result = await importAssets(importFile);
    setImportResult(result);
  };

  return (
    <div className="min-h-screen bg-background">
      <AssetTopBar />

      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/assets/tools")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Import / Export Assets</h1>
            <p className="text-sm text-muted-foreground">
              Bulk import or export your asset data
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "export" | "import")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="export" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Fields to Export</CardTitle>
                <CardDescription>
                  Choose which fields to include in your export file. Human-readable names will be used.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(EXPORT_FIELD_GROUPS).map(([groupKey, group]) => (
                  <div key={groupKey} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`group-${groupKey}`}
                        checked={isGroupFullySelected(groupKey)}
                        onCheckedChange={(checked) => handleSelectAll(groupKey, !!checked)}
                      />
                      <Label
                        htmlFor={`group-${groupKey}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {group.label}
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {group.fields.filter((f) => selectedFields.includes(f.key)).length}/
                        {group.fields.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pl-6">
                      {group.fields.map((field) => (
                        <div key={field.key} className="flex items-center gap-2">
                          <Checkbox
                            id={field.key}
                            checked={selectedFields.includes(field.key)}
                            onCheckedChange={(checked) => handleFieldToggle(field.key, !!checked)}
                          />
                          <Label
                            htmlFor={field.key}
                            className="text-xs cursor-pointer text-muted-foreground"
                          >
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button onClick={handleExport} disabled={isExporting || selectedFields.length === 0}>
                    {isExporting ? (
                      <>Exporting...</>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export {selectedFields.length} Fields as CSV
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedFields.length} fields selected
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Assets from CSV</CardTitle>
                <CardDescription>
                  Upload a CSV file to import assets. Download the template for the correct format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template Download */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileDown className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Download Import Template</p>
                    <p className="text-xs text-muted-foreground">
                      Get the correct CSV format with example data
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Template
                  </Button>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="import-file">Select CSV File</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                  />
                  {importFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                {/* Import Button */}
                <Button
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                  className="w-full sm:w-auto"
                >
                  {isImporting ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                      Importing... ({importProgress.current}/{importProgress.total})
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Assets
                    </>
                  )}
                </Button>

                {/* Progress */}
                {isImporting && (
                  <div className="space-y-2">
                    <Progress
                      value={(importProgress.current / importProgress.total) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Processing row {importProgress.current} of {importProgress.total}
                    </p>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">{importResult.success} imported</span>
                      </div>
                      {importResult.errors.length > 0 && (
                        <div className="flex items-center gap-2 text-destructive">
                          <XCircle className="h-5 w-5" />
                          <span className="font-medium">{importResult.errors.length} errors</span>
                        </div>
                      )}
                    </div>

                    {/* Error Details */}
                    {importErrors.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Import Errors
                        </div>
                        <ScrollArea className="h-48 rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-20">Row</TableHead>
                                <TableHead>Error</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importErrors.map((err, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono text-xs">{err.row}</TableCell>
                                  <TableCell className="text-xs text-destructive">
                                    {err.error}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Field Mapping Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Supported Columns</CardTitle>
                <CardDescription>
                  Use these column headers in your CSV file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[
                    "Asset Tag ID",
                    "Name",
                    "Description",
                    "Category",
                    "Brand (Make)",
                    "Model",
                    "Serial Number",
                    "Status",
                    "Location",
                    "Department",
                    "Cost",
                    "Purchase Date",
                    "Purchased From (Vendor)",
                    "Warranty Expiry",
                    "Notes",
                    "Configuration",
                    "Classification",
                  ].map((col) => (
                    <Badge key={col} variant="outline" className="text-xs justify-start">
                      {col}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Required:</strong> Asset Tag ID. All other fields are optional.
                  Category, Make, Location, Department, and Vendor must match existing names.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
