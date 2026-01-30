import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";

export interface FeedFilters {
  newAssets: boolean;
  checkedOut: boolean;
  checkedIn: boolean;
  underRepair: boolean;
  disposed: boolean;
}

const DEFAULT_FILTERS: FeedFilters = {
  newAssets: false,
  checkedOut: false,
  checkedIn: true,
  underRepair: true,
  disposed: false,
};

interface FeedSettingsDropdownProps {
  filters: FeedFilters;
  onFiltersChange: (filters: FeedFilters) => void;
}

export function FeedSettingsDropdown({
  filters,
  onFiltersChange,
}: FeedSettingsDropdownProps) {
  const toggleFilter = (key: keyof FeedFilters) => {
    onFiltersChange({
      ...filters,
      [key]: !filters[key],
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Show Feeds</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={filters.newAssets}
          onCheckedChange={() => toggleFilter("newAssets")}
        >
          New Assets
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.checkedOut}
          onCheckedChange={() => toggleFilter("checkedOut")}
        >
          Checked Out
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.checkedIn}
          onCheckedChange={() => toggleFilter("checkedIn")}
        >
          Checked In
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.underRepair}
          onCheckedChange={() => toggleFilter("underRepair")}
        >
          Under Repair
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.disposed}
          onCheckedChange={() => toggleFilter("disposed")}
        >
          Disposed
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DEFAULT_FILTERS };
