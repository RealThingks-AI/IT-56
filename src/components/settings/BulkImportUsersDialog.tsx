import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ParsedUser {
  name: string;
  email: string;
  password: string;
}

interface ImportResult {
  email: string;
  status: "created" | "skipped" | "error";
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkImportUsersDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [defaultRole, setDefaultRole] = useState("user");
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<{ created: number; skipped: number; errored: number } | null>(null);

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const parseCSV = (text: string): ParsedUser[] => {
    // Strip UTF-8 BOM character
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    // Detect header using robust CSV parser
    const header = parseCSVLine(lines[0]);
    const nameIdx = header.findIndex((h) => /user\s*name|name|display/i.test(h));
    const emailIdx = header.findIndex((h) => /email|e-mail/i.test(h));
    const passIdx = header.findIndex((h) => /password|pass/i.test(h));

    if (emailIdx === -1) {
      toast.error("CSV must have an 'Email' column");
      return [];
    }

    const users: ParsedUser[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const email = cols[emailIdx]?.trim();
      if (!email) continue;

      users.push({
        name: nameIdx >= 0 ? cols[nameIdx]?.trim() || "" : "",
        email,
        password: passIdx >= 0 ? cols[passIdx]?.trim() || email : email,
      });
    }
    return users;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setImportResults(null);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const users = parseCSV(text);
      setParsedUsers(users);
      if (users.length === 0) {
        toast.error("No valid users found in file");
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (parsedUsers.length === 0) return;
    setIsImporting(true);
    setImportResults(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `https://iarndwlbrmjbsjvugqvr.supabase.co/functions/v1/bulk-create-users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            users: parsedUsers.map((u) => ({
              email: u.email,
              name: u.name,
              password: u.password,
              role: defaultRole,
            })),
            defaultRole,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      setImportResults(result.results);
      setSummary({ created: result.created, skipped: result.skipped, errored: result.errored });

      if (result.created > 0) {
        toast.success(`${result.created} users created successfully`);
      }
      if (result.skipped > 0) {
        toast.info(`${result.skipped} users skipped (already exist)`);
      }
      if (result.errored > 0) {
        toast.warning(`${result.errored} users failed`);
      }
    } catch (err: any) {
      toast.error("Bulk import failed: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!isImporting) {
      onOpenChange(open);
      if (!open) {
        setFile(null);
        setParsedUsers([]);
        setImportResults(null);
        setSummary(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: User Name, Email, Password
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* File input + role selector */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isImporting}
              />
            </div>
            <div className="w-32 space-y-1.5">
              <Label>Default Role</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole} disabled={isImporting}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview / Results */}
          {parsedUsers.length > 0 && !importResults && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <FileSpreadsheet className="inline h-4 w-4 mr-1" />
                  {parsedUsers.length} users found in file
                </p>
                <Button onClick={handleImport} disabled={isImporting} size="sm">
                  {isImporting ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import All ({parsedUsers.length})
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea className="flex-1 max-h-[350px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedUsers.map((u, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-sm">{u.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}

          {/* Import Results */}
          {importResults && summary && (
            <>
              <div className="flex items-center gap-4">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {summary.created} created
                </Badge>
                {summary.skipped > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {summary.skipped} skipped
                  </Badge>
                )}
                {summary.errored > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {summary.errored} failed
                  </Badge>
                )}
              </div>
              <ScrollArea className="flex-1 max-h-[350px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{r.email}</TableCell>
                        <TableCell>
                          {r.status === "created" && (
                            <Badge variant="default" className="text-xs">Created</Badge>
                          )}
                          {r.status === "skipped" && (
                            <Badge variant="secondary" className="text-xs">Skipped</Badge>
                          )}
                          {r.status === "error" && (
                            <Badge variant="destructive" className="text-xs">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.error || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
