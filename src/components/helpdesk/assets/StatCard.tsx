import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ElementType;
  value: number | string;
  label: string;
  colorClass: string;
  onClick?: () => void;
  active?: boolean;
}

export const StatCard = ({ icon: Icon, value, label, colorClass, onClick, active }: StatCardProps) => (
  <Card className={`transition-all duration-200 ${onClick ? "cursor-pointer hover:border-primary/30 hover:scale-[1.02]" : ""} ${active ? "border-2 border-primary" : ""}`} onClick={onClick}>
    <CardContent className="p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);
