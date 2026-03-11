import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { CategoryDistItem } from "./types";

const PIE_COLORS = ["#3b82f6", "#10b981", "#a855f7", "#f97316", "#06b6d4", "#f43f5e"];

interface CategoryPieChartProps {
  categoryDistribution: CategoryDistItem[];
  totalAssets: number;
}

export function CategoryPieChart({ categoryDistribution, totalAssets }: CategoryPieChartProps) {
  const navigate = useNavigate();

  if (categoryDistribution.length === 0) return null;

  return (
    <Card className="animate-fade-in" style={{ animationDelay: "140ms", animationDuration: "350ms", animationFillMode: "backwards" }}>
      <CardHeader className="py-2 px-3 border-b">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assets by Category</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="flex flex-row gap-3 items-center">
          <div className="w-[130px] h-[130px] shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="name"
                  stroke="none"
                  animationDuration={600}
                >
                  {categoryDistribution.map((cat, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/assets/allassets?category=${encodeURIComponent(cat.name)}`)}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-md px-2.5 py-1.5 text-xs shadow-md">
                        <p className="font-medium">{d.name}</p>
                        <p className="text-muted-foreground">{d.count} assets ({d.percent}%)</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-base font-bold text-foreground leading-none">{totalAssets}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1 min-w-0 max-h-[130px] overflow-y-auto pr-1">
            {categoryDistribution.map((cat, i) => (
              <div
                key={cat.name}
                className="cursor-pointer hover:bg-accent/30 rounded px-2 py-1 transition-colors"
                onClick={() => navigate(`/assets/allassets?category=${encodeURIComponent(cat.name)}`)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs truncate flex-1">{cat.name}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{cat.count}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-8 text-right">{cat.percent}%</span>
                </div>
                <div className="ml-[18px] mt-0.5 h-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${cat.percent}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}