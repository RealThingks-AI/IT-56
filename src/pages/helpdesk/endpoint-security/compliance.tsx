import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ComplianceItem {
  id: number; hostname: string; avActive: boolean; osPatched: boolean; diskEncrypted: boolean; firewallOn: boolean;
}

const icon = (v: boolean) => v ? <CheckCircle className="h-4 w-4 text-chart-3" /> : <XCircle className="h-4 w-4 text-destructive" />;

export default function CompliancePage() {
  const [items] = useState<ComplianceItem[]>([]);
  const [showNonCompliantOnly, setShowNonCompliantOnly] = useState(false);
  const filtered = showNonCompliantOnly ? items.filter(i => !i.avActive || !i.osPatched || !i.diskEncrypted || !i.firewallOn) : items;

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={showNonCompliantOnly} onCheckedChange={setShowNonCompliantOnly} />
          <span className="text-sm text-muted-foreground">Show non-compliant only</span>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs"><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>AV Active</TableHead>
                <TableHead>OS Patched</TableHead>
                <TableHead>Disk Encrypted</TableHead>
                <TableHead>Firewall On</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(i => {
                const compliant = i.avActive && i.osPatched && i.diskEncrypted && i.firewallOn;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium py-1.5">{i.hostname}</TableCell>
                    <TableCell className="py-1.5">{icon(i.avActive)}</TableCell>
                    <TableCell className="py-1.5">{icon(i.osPatched)}</TableCell>
                    <TableCell className="py-1.5">{icon(i.diskEncrypted)}</TableCell>
                    <TableCell className="py-1.5">{icon(i.firewallOn)}</TableCell>
                    <TableCell className="py-1.5"><Badge variant={compliant ? "default" : "destructive"}>{compliant ? "Compliant" : "Non-Compliant"}</Badge></TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No compliance data found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
