import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Plus } from "lucide-react";

interface LinkingTabProps {
  assetId: string;
}

export const LinkingTab = ({ assetId }: LinkingTabProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <Button variant="outline" size="sm" className="w-full" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Link Asset
          </Button>

          <div className="text-center py-6">
            <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No linked assets</p>
            <p className="text-xs text-muted-foreground mt-1">Asset linking coming soon</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
