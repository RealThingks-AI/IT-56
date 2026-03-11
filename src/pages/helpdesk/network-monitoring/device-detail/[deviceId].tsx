import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BackButton } from "@/components/BackButton";

export default function NetworkDeviceDetail() {
  const { deviceId } = useParams();

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <BackButton />
      <div className="flex items-center gap-2.5">
        <h2 className="text-base font-semibold text-foreground">Device #{deviceId}</h2>
        <Badge variant="secondary">Unknown</Badge>
      </div>
      <p className="text-sm text-muted-foreground">No device data available. Add devices from the Devices page.</p>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="pings">Ping History</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-3">
              <p className="text-sm text-muted-foreground text-center py-8">No device information available</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader className="pb-2 px-3 pt-3"><CardTitle className="text-sm">Response Time (24h)</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-sm text-muted-foreground text-center py-8">No performance data yet</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pings">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Response (ms)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No ping history</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardContent className="p-3">
              <p className="text-sm text-muted-foreground text-center py-4">No alerts for this device</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
