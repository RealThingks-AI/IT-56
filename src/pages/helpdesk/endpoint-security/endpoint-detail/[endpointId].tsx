import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BackButton } from "@/components/BackButton";

export default function EndpointDetail() {
  const { endpointId } = useParams();

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <BackButton />
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-foreground">Endpoint #{endpointId}</h2>
        <Badge variant="secondary">Unknown</Badge>
      </div>
      <p className="text-sm text-muted-foreground">No endpoint data available. Add endpoints from the Endpoints page.</p>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scans">Scan History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-3">
              <p className="text-sm text-muted-foreground text-center py-8">No endpoint information available</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scans">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No scan history</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card><CardContent className="p-3"><p className="text-sm text-muted-foreground text-center py-4">No notes yet</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
