import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus } from "lucide-react";

interface AuditTabProps {
  assetId: string;
}

export const AuditTab = ({ assetId }: AuditTabProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <Button variant="outline" size="sm" className="w-full" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Record Audit
          </Button>

          <div className="text-center py-6">
            <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No audit records</p>
            <p className="text-xs text-muted-foreground mt-1">Audit tracking coming soon</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
