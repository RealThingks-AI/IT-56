import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface UpdateFiltersProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  counts: Record<string, number>;
}

export function UpdateFilters({ activeCategory, onCategoryChange, counts }: UpdateFiltersProps) {
  const categories = [
    { key: 'all', label: 'All Updates' },
    { key: 'windows', label: 'Windows' },
    { key: 'server', label: 'Server' },
    { key: 'critical', label: 'Critical Systems' },
    { key: 'security', label: 'Security' },
    { key: 'firmware', label: 'Firmware' },
    { key: 'application', label: 'Applications' },
  ];

  return (
    <Tabs value={activeCategory} onValueChange={onCategoryChange} className="w-full">
      <TabsList className="grid w-full grid-cols-7 h-auto">
        {categories.map((cat) => (
          <TabsTrigger 
            key={cat.key} 
            value={cat.key}
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <span className="flex items-center gap-2">
              {cat.label}
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 flex items-center justify-center px-1.5">
                {counts[cat.key] || 0}
              </Badge>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
