import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";

export default function ReportsPage() {
  const navigate = useNavigate();

  const assetReports = [
    { id: "by-tag", title: "By Asset Tag", description: "List assets by tag ID" },
    { id: "by-tag-pictures", title: "By Tag with Pictures", description: "Assets with images" },
    { id: "by-category", title: "By Category", description: "Group by category" },
    { id: "by-site", title: "By Site / Location", description: "Assets per site" },
    { id: "by-department", title: "By Department", description: "Assets by department" },
    { id: "by-warranty", title: "By Warranty Info", description: "Warranty status" },
  ];

  const additionalReports = [
    { id: "audit", title: "Audit Reports", description: "Asset audit activity" },
    { id: "checkout", title: "Check-Out Reports", description: "Assignment history" },
    { id: "maintenance", title: "Maintenance Reports", description: "Repair and maintenance" },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">Generate and export asset reports</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Asset Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assetReports.map((report) => (
              <Card key={report.id} className="hover:border-primary cursor-pointer transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-xs">{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" className="w-full">
                    <Download className="h-3 w-3 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Additional Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {additionalReports.map((report) => (
              <Card key={report.id} className="hover:border-primary cursor-pointer transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-xs">{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" className="w-full">
                    <Download className="h-3 w-3 mr-2" />
                    Generate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
