import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SettingsLoadingSkeletonProps {
  cards?: number;
  rows?: number;
}

export function SettingsLoadingSkeleton({
  cards = 2,
  rows = 4,
}: SettingsLoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: cards }).map((_, cardIndex) => (
        <Card key={cardIndex} className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
