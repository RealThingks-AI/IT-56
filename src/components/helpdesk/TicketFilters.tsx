import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, X, Filter, SlidersHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUserDisplayName } from "@/lib/userUtils";

interface TicketFiltersProps {
  onFilterChange: (filters: any) => void;
  activeFilters: any;
}

export const TicketFilters = ({ onFilterChange, activeFilters }: TicketFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['helpdesk-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('helpdesk_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return data || [];
    }
  });

  const { data: users } = useQuery({
    queryKey: ['helpdesk-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('status', 'active')
        .order('name');
      return data || [];
    }
  });

  const handleFilterChange = (key: string, value: any) => {
    onFilterChange({ ...activeFilters, [key]: value });
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const activeFilterCount = Object.keys(activeFilters).filter(key => 
    activeFilters[key] !== null && activeFilters[key] !== undefined && activeFilters[key] !== ''
  ).length;

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets by title, description, or ticket number..."
            value={activeFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={activeFilters.status || 'all'}
          onValueChange={(value) => handleFilterChange('status', value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={activeFilters.priority || 'all'}
          onValueChange={(value) => handleFilterChange('priority', value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 min-w-[1.25rem]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={clearAllFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={activeFilters.category || 'all'}
              onValueChange={(value) => handleFilterChange('category', value === 'all' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assigned To</label>
            <Select
              value={activeFilters.assignee || 'all'}
              onValueChange={(value) => handleFilterChange('assignee', value === 'all' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {getUserDisplayName(user) || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Created From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {activeFilters.dateFrom ? format(new Date(activeFilters.dateFrom), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={activeFilters.dateFrom ? new Date(activeFilters.dateFrom) : undefined}
                  onSelect={(date) => handleFilterChange('dateFrom', date?.toISOString())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Created To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {activeFilters.dateTo ? format(new Date(activeFilters.dateTo), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={activeFilters.dateTo ? new Date(activeFilters.dateTo) : undefined}
                  onSelect={(date) => handleFilterChange('dateTo', date?.toISOString())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value || value === 'all') return null;
            
            let displayValue = value as string;
            if (key === 'dateFrom' || key === 'dateTo') {
              displayValue = format(new Date(value as string), "PP");
            } else if (key === 'category') {
              const cat = categories?.find(c => c.id.toString() === value);
              displayValue = cat?.name || value as string;
            } else if (key === 'assignee' && value !== 'unassigned') {
              const user = users?.find(u => u.id === value);
              displayValue = getUserDisplayName(user) || value as string;
            }

            return (
              <Badge key={key} variant="secondary" className="gap-1 pr-1">
                {key}: {displayValue}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0.5 hover:bg-transparent"
                  onClick={() => clearFilter(key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
