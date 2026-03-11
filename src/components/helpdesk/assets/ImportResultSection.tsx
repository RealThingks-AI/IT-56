import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, PenLine, Plus, Info, Users, ArrowRight, SkipForward, HelpCircle, Check, X, Undo2, CheckCheck, Tags } from "lucide-react";
import type { DetailedImportResult, ImportRowResult, UserMatchDetail, CategoryMatchDetail } from "@/hooks/assets/useAssetExportImport";

interface ImportResultSectionProps {
  result: DetailedImportResult;
  errors: { row: number; error: string }[];
  onClear: () => void;
}

export function ImportResultSection({ result, errors, onClear }: ImportResultSectionProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [verifiedMatches, setVerifiedMatches] = useState<Set<string>>(new Set());
  const [rejectedMatches, setRejectedMatches] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>(
    errors.length > 0 ? "errors" : result.warnings.length > 0 ? "warnings" : "summary"
  );

  const toggleRow = (rowNum: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  };

  const updatedRows = result.rows.filter((r) => r.action === "updated");
  const createdRows = result.rows.filter((r) => r.action === "created");
  const skippedRows = result.rows.filter((r) => r.action === "skipped");
  const errorRows = result.rows.filter((r) => r.action === "error");
  const warningRows = result.rows.filter((r) => r.warnings.length > 0);

  // Compute field update frequency
  const fieldCounts: Record<string, number> = {};
  for (const row of [...updatedRows, ...createdRows]) {
    for (const f of row.fieldsUpdated) {
      fieldCounts[f] = (fieldCounts[f] || 0) + 1;
    }
  }
  const sortedFields = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]);

  // User matching stats
  const userMatches = result.userMatches || [];
  const exactMatches = userMatches.filter((m) => m.matchType === "exact");
  const fuzzyMatches = userMatches.filter((m) => m.matchType === "fuzzy");
  const skippedMatches = userMatches.filter((m) => m.matchType === "skipped");
  const unresolvedMatches = userMatches.filter((m) => m.matchType === null);
  // Deduplicate for display
  const uniqueFuzzy = dedupeMatches(fuzzyMatches);
  const uniqueUnresolved = dedupeMatches(unresolvedMatches);
  const uniqueSkipped = dedupeMatches(skippedMatches);
  const hasUserMatchData = userMatches.length > 0;

  // Category issues
  const categoryIssues = result.categoryIssues || [];
  const hasCategoryIssues = categoryIssues.length > 0;

  // Filter out warnings that have been verified or are about skipped placeholders already shown
  const resolvedFuzzyNames = new Set(
    [...verifiedMatches].map(k => k.toLowerCase())
  );
  const filteredWarnings = result.warnings.filter((w) => {
    // Check if this warning is about a fuzzy match that's been verified
    const approxMatch = w.match(/^"(.+?)" matched to ".+?" \(approximate/);
    if (approxMatch) {
      const rawName = approxMatch[1].toLowerCase();
      return !resolvedFuzzyNames.has(rawName);
    }
    return true;
  });

  return (
    <div className="space-y-3 pt-3 border-t animate-in fade-in-0 duration-200">
      {/* Summary stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-primary">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">{result.success} imported</span>
          </div>
          {result.created > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Plus className="h-3 w-3" /> {result.created} created
            </Badge>
          )}
          {result.updated > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <PenLine className="h-3 w-3" /> {result.updated} updated
            </Badge>
          )}
          {(result.skipped || 0) > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
              <SkipForward className="h-3 w-3" /> {result.skipped} skipped
            </Badge>
          )}
          {errorRows.length > 0 && (
            <div className="flex items-center gap-1.5 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{errorRows.length} errors</span>
            </div>
          )}
          {filteredWarnings.length > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{filteredWarnings.length} warnings</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>Clear</Button>
      </div>

      {/* Detailed tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="summary" className="text-[11px] h-6 px-2.5">
            <Info className="h-3 w-3 mr-1" /> Summary
          </TabsTrigger>
          {hasUserMatchData && (
            <TabsTrigger value="users" className="text-[11px] h-6 px-2.5">
              <Users className="h-3 w-3 mr-1" /> User Matching
            </TabsTrigger>
          )}
          <TabsTrigger value="details" className="text-[11px] h-6 px-2.5">
            <PenLine className="h-3 w-3 mr-1" /> Details ({result.rows.length})
          </TabsTrigger>
          {errors.length > 0 && (
            <TabsTrigger value="errors" className="text-[11px] h-6 px-2.5 text-destructive">
              <XCircle className="h-3 w-3 mr-1" /> Errors ({errors.length})
            </TabsTrigger>
          )}
          {hasCategoryIssues && (
            <TabsTrigger value="categories" className="text-[11px] h-6 px-2.5 text-amber-600">
              <Tags className="h-3 w-3 mr-1" /> Category Issues ({categoryIssues.length})
            </TabsTrigger>
          )}
          {filteredWarnings.length > 0 && (
            <TabsTrigger value="warnings" className="text-[11px] h-6 px-2.5 text-amber-600">
              <AlertTriangle className="h-3 w-3 mr-1" /> Warnings ({filteredWarnings.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Summary tab */}
        <TabsContent value="summary" className="mt-2 space-y-3">
          <div className={`grid ${(result.skipped || 0) > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
            <div className="p-2.5 rounded-lg bg-muted/50 text-center">
              <p className="text-lg font-semibold text-primary">{result.success}</p>
              <p className="text-[10px] text-muted-foreground">Successful</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/50 text-center">
              <p className="text-lg font-semibold text-emerald-600">{result.created}</p>
              <p className="text-[10px] text-muted-foreground">Created</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/50 text-center">
              <p className="text-lg font-semibold text-blue-600">{result.updated}</p>
              <p className="text-[10px] text-muted-foreground">Updated</p>
            </div>
            {(result.skipped || 0) > 0 && (
              <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-semibold text-muted-foreground">{result.skipped}</p>
                <p className="text-[10px] text-muted-foreground">Skipped</p>
              </div>
            )}
          </div>

          {sortedFields.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Fields Updated</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedFields.map(([field, count]) => (
                  <Badge key={field} variant="secondary" className="text-[10px] gap-1">
                    {field} <span className="text-muted-foreground">×{count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* User Matching tab */}
        {hasUserMatchData && (
          <TabsContent value="users" className="mt-2 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-semibold text-primary">{exactMatches.length}</p>
                <p className="text-[10px] text-muted-foreground">Exact</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-semibold text-amber-600">{fuzzyMatches.length}</p>
                <p className="text-[10px] text-muted-foreground">Approximate</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-semibold text-muted-foreground">{skippedMatches.length}</p>
                <p className="text-[10px] text-muted-foreground">Skipped</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-semibold text-destructive">{unresolvedMatches.length}</p>
                <p className="text-[10px] text-muted-foreground">Unresolved</p>
              </div>
            </div>

            {uniqueFuzzy.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Approximate Matches — Please Verify
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {verifiedMatches.size} of {uniqueFuzzy.length} verified
                    </span>
                    {verifiedMatches.size < uniqueFuzzy.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-5 text-[10px] px-1.5 gap-0.5"
                        onClick={() => setVerifiedMatches(new Set(uniqueFuzzy.map(m => m.rawName.toLowerCase())))}
                      >
                        <CheckCheck className="h-3 w-3" /> Verify All
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="max-h-40 rounded-md border">
                  <div className="p-1.5 space-y-0.5">
                    {uniqueFuzzy.map((m, i) => {
                      const key = m.rawName.toLowerCase();
                      const isVerified = verifiedMatches.has(key);
                      const isRejected = rejectedMatches.has(key);

                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 text-[11px] rounded px-1.5 py-1 transition-colors ${
                            isVerified ? "bg-emerald-50 dark:bg-emerald-950/30" :
                            isRejected ? "bg-muted/60" : "hover:bg-muted/30"
                          }`}
                        >
                          <span className="font-mono text-muted-foreground">{m.rawName}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className={`font-medium ${isRejected ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {m.matchedName}
                          </span>
                          <span className="ml-auto flex items-center gap-1 shrink-0">
                            {isVerified ? (
                              <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                              </Badge>
                            ) : isRejected ? (
                              <>
                                <Badge variant="outline" className="text-[9px] h-4 gap-0.5 border-destructive/30 text-destructive">
                                  <XCircle className="h-2.5 w-2.5" /> Rejected
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0"
                                  onClick={() => setRejectedMatches(prev => { const n = new Set(prev); n.delete(key); return n; })}
                                >
                                  <Undo2 className="h-2.5 w-2.5 text-muted-foreground" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                                  onClick={() => { setVerifiedMatches(prev => new Set(prev).add(key)); setRejectedMatches(prev => { const n = new Set(prev); n.delete(key); return n; }); }}
                                  title="Verify match"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => { setRejectedMatches(prev => new Set(prev).add(key)); setVerifiedMatches(prev => { const n = new Set(prev); n.delete(key); return n; }); }}
                                  title="Reject match"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {uniqueUnresolved.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-destructive mb-1.5 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" /> Unresolved Names
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueUnresolved.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] text-destructive border-destructive/30">
                      {m.rawName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {uniqueSkipped.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <SkipForward className="h-3 w-3" /> Skipped (Non-User Values)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueSkipped.map((m, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {m.rawName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {/* Category Issues tab */}
        {hasCategoryIssues && (
          <TabsContent value="categories" className="mt-2 space-y-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {categoryIssues.length} asset(s) have a tag prefix that conflicts with the assigned category.
              </p>
            </div>
            <ScrollArea className="max-h-48 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Asset Tag</TableHead>
                    <TableHead className="text-xs">Tag Prefix</TableHead>
                    <TableHead className="text-xs">Expected Category</TableHead>
                    <TableHead className="text-xs">Actual Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryIssues.map((issue, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-[11px]">{issue.assetTag}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{issue.tagPrefix}</Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-emerald-600 font-medium">{issue.expectedCategory}</TableCell>
                      <TableCell className="text-[11px] text-destructive font-medium">{issue.actualCategory}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        )}

        {/* Details tab */}
        <TabsContent value="details" className="mt-2">
          <ScrollArea className="h-60 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-xs"></TableHead>
                  <TableHead className="w-14 text-xs">Row</TableHead>
                  <TableHead className="text-xs">Asset Tag</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Fields</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row) => (
                  <RowDetail key={row.rowNum} row={row} expanded={expandedRows.has(row.rowNum)} onToggle={() => toggleRow(row.rowNum)} />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>

        {/* Errors tab */}
        {errors.length > 0 && (
          <TabsContent value="errors" className="mt-2">
            <ScrollArea className="h-40 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-xs">Row</TableHead>
                    <TableHead className="text-xs">Asset Tag</TableHead>
                    <TableHead className="text-xs">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorRows.length > 0 ? errorRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-[11px]">{row.rowNum}</TableCell>
                      <TableCell className="text-[11px] font-mono">{row.assetTag}</TableCell>
                      <TableCell className="text-[11px] text-destructive">{row.error}</TableCell>
                    </TableRow>
                  )) : errors.map((err, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-[11px]">{err.row}</TableCell>
                      <TableCell className="text-[11px]">-</TableCell>
                      <TableCell className="text-[11px] text-destructive">{err.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        )}

        {/* Warnings tab */}
        {filteredWarnings.length > 0 && (
          <TabsContent value="warnings" className="mt-2">
            <ScrollArea className="h-40 rounded-md border">
              <div className="p-2 space-y-1">
                {filteredWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function dedupeMatches(matches: UserMatchDetail[]): UserMatchDetail[] {
  const seen = new Set<string>();
  return matches.filter((m) => {
    const key = m.rawName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function RowDetail({ row, expanded, onToggle }: { row: ImportRowResult; expanded: boolean; onToggle: () => void }) {
  const actionColor = row.action === "created" ? "text-emerald-600" : row.action === "updated" ? "text-blue-600" : row.action === "skipped" ? "text-muted-foreground" : "text-destructive";
  const actionLabel = row.action === "created" ? "New" : row.action === "updated" ? "Updated" : row.action === "skipped" ? "Skipped" : "Error";

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell className="px-2">
          {row.fieldsUpdated.length > 0 ? (
            expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : null}
        </TableCell>
        <TableCell className="font-mono text-[11px]">{row.rowNum}</TableCell>
        <TableCell className="font-mono text-[11px]">{row.assetTag}</TableCell>
        <TableCell>
          <span className={`text-[11px] font-medium ${actionColor}`}>{actionLabel}</span>
          {row.warnings.length > 0 && <AlertTriangle className="h-3 w-3 text-amber-500 inline ml-1" />}
        </TableCell>
        <TableCell className="text-[11px] text-muted-foreground">
          {row.action === "error" ? row.error : row.action === "skipped" ? "No changes" : `${row.fieldsUpdated.length} fields`}
        </TableCell>
      </TableRow>
      {expanded && row.fieldsUpdated.length > 0 && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30 py-1.5 px-4">
            <div className="flex flex-wrap gap-1">
              {row.fieldsUpdated.map((f) => (
                <Badge key={f} variant="outline" className="text-[10px] h-4">{f}</Badge>
              ))}
            </div>
            {row.warnings.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {row.warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-amber-600">⚠ {w}</p>
                ))}
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}