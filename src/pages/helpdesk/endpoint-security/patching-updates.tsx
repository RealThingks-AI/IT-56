import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search } from "lucide-react";
import { format } from "date-fns";

const severityBadge = (severity: string | null) => {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "important":
      return <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30">Important</Badge>;
    case "moderate":
      return <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30">Moderate</Badge>;
    case "low":
      return <Badge variant="secondary">Low</Badge>;
    default:
      return <Badge variant="outline">{severity || "Unknown"}</Badge>;
  }
};

export default function PatchingUpdatesPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["patching-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_updates")
        .select("*")
        .order("release_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = updates.filter((u) => {
    const matchesSearch =
      !search ||
      u.title.toLowerCase().includes(search.toLowerCase()) ||
      u.kb_number?.toLowerCase().includes(search.toLowerCase()) ||
      u.category?.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === "all" || u.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patching — Updates</h1>
        <p className="text-sm text-muted-foreground mt-1">Available system updates and patches</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search title, KB, category…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="important">Important</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Download className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">No updates found</p>
          <p className="text-xs mt-1">System updates will appear here once ingested.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>KB Number</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Release Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((update) => (
                <TableRow key={update.id}>
                  <TableCell className="font-medium max-w-md truncate">{update.title}</TableCell>
                  <TableCell className="text-muted-foreground">{update.kb_number || "—"}</TableCell>
                  <TableCell>{severityBadge(update.severity)}</TableCell>
                  <TableCell className="text-muted-foreground">{update.category || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {update.release_date ? format(new Date(update.release_date), "MMM d, yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
