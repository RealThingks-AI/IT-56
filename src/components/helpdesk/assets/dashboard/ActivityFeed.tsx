import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import { FeedRow } from "@/components/helpdesk/assets/FeedRow";
import { FeedSettingsDropdown, FeedFilters } from "@/components/helpdesk/assets/FeedSettingsDropdown";
import { ChevronRight, RefreshCw, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CheckinRecord,
  CheckoutRecord,
  RepairRecord,
  DashboardAsset,
} from "./types";

const FeedEmptyState = ({ message, actionLabel, actionPath }: { message: string; actionLabel?: string; actionPath?: string }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-1.5">
      <Inbox className="h-5 w-5 opacity-30" />
      <p className="text-xs">{message}</p>
      {actionLabel && actionPath && (
        <Button variant="outline" size="sm" className="text-xs h-6 mt-1" onClick={() => navigate(actionPath)}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

interface ActivityFeedProps {
  feedFilters: FeedFilters;
  onFeedFiltersChange: (filters: FeedFilters) => void;
  recentCheckins: CheckinRecord[];
  recentCheckouts: CheckoutRecord[];
  activeRepairs: RepairRecord[];
  newAssets: DashboardAsset[];
  disposedAssets: DashboardAsset[];
  checkinsLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

// Standardized 4-column header for all tabs
const feedColumnHeaders: Record<string, { col1: string; col2: string; col3: string; col4: string }> = {
  checkedin: { col1: "#", col2: "Asset Tag", col3: "Returned From", col4: "Date" },
  checkedout: { col1: "#", col2: "Asset Tag", col3: "Assigned To", col4: "Date" },
  repair: { col1: "#", col2: "Asset Tag", col3: "Issue", col4: "Date" },
  new: { col1: "#", col2: "Asset Tag", col3: "Category", col4: "Date" },
  disposed: { col1: "#", col2: "Asset Tag", col3: "Category", col4: "Date" },
};

export function ActivityFeed({
  feedFilters,
  onFeedFiltersChange,
  recentCheckins,
  recentCheckouts,
  activeRepairs,
  newAssets,
  disposedAssets,
  checkinsLoading,
  isRefreshing,
  onRefresh,
}: ActivityFeedProps) {
  const navigate = useNavigate();

  const tabCounts: Record<string, number> = useMemo(() => ({
    checkedin: recentCheckins.length,
    checkedout: recentCheckouts.length,
    repair: activeRepairs.length,
    new: newAssets.length,
    disposed: disposedAssets.length,
  }), [recentCheckins, recentCheckouts, activeRepairs, newAssets, disposedAssets]);

  const feedTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [];
    if (feedFilters.checkedIn) tabs.push({ id: "checkedin", label: "Checked In" });
    if (feedFilters.checkedOut) tabs.push({ id: "checkedout", label: "Checked Out" });
    if (feedFilters.underRepair) tabs.push({ id: "repair", label: "Repair" });
    if (feedFilters.newAssets) tabs.push({ id: "new", label: "New" });
    if (feedFilters.disposed) tabs.push({ id: "disposed", label: "Disposed" });
    return tabs.length > 0 ? tabs : [{ id: "checkedin", label: "Checked In" }];
  }, [feedFilters]);

  const [activeTab, setActiveTab] = useState("checkedin");

  useEffect(() => {
    if (feedTabs.length > 0 && !feedTabs.some((t) => t.id === activeTab)) {
      setActiveTab(feedTabs[0].id);
    }
  }, [feedTabs, activeTab]);

  const currentHeaders = feedColumnHeaders[activeTab] || feedColumnHeaders.checkedin;

  return (
    <Card className="animate-fade-in flex flex-col" style={{ animationDelay: "80ms", animationDuration: "350ms", animationFillMode: "backwards" }}>
      <CardHeader className="pb-0 flex flex-row items-center justify-between py-2 px-3 border-b">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity Feed</CardTitle>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} disabled={isRefreshing}>
                  <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Refresh data</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <FeedSettingsDropdown filters={feedFilters} onFiltersChange={onFeedFiltersChange} />
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        {checkinsLoading ? (
          <div className="p-2.5 space-y-1">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[24px] w-full" />)}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full flex rounded-none border-b bg-transparent overflow-x-auto h-8 px-1 shrink-0">
              {feedTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="text-xs flex-1 min-w-0 px-2 py-1 gap-1.5 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  {tab.label}
                  <span className="text-[9px] font-medium tabular-nums bg-muted rounded px-1 py-0.5">
                    {tabCounts[tab.id] || 0}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Standardized 4-column header for all tabs */}
            <div className="grid grid-cols-[minmax(0,0.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-1.5 px-2.5 py-0.5 border-b bg-muted">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col1}</span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col2}</span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{currentHeaders.col3}</span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-right">{currentHeaders.col4}</span>
            </div>

            <ScrollArea className="flex-1 max-h-[340px]">
              <TabsContent value="checkedin" className="mt-0">
                {recentCheckins.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {recentCheckins.map((c, i) => (
                      <FeedRow key={c.id} index={i} tag={c.asset_tag || c.asset?.asset_tag || c.asset?.asset_id || "—"} col2={c.user_name || "—"} date={c.created_at || undefined} onClick={() => (c.asset ? navigate(`/assets/detail/${c.asset.asset_tag || c.asset.asset_id || c.asset.id}`) : null)} />
                    ))}
                  </div>
                ) : (
                  <FeedEmptyState message="No recent check-ins" actionLabel="Check in an asset" actionPath="/assets/checkin" />
                )}
              </TabsContent>

              <TabsContent value="checkedout" className="mt-0">
                {recentCheckouts.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {recentCheckouts.map((c, i) => (
                      <FeedRow key={c.id} index={i} tag={c.asset_tag || c.asset_id || ""} col2={c.assigned_to_name || "—"} date={c.checked_out_at || c.updated_at || undefined} onClick={() => (c.asset_tag || c.asset_id ? navigate(`/assets/detail/${c.asset_tag || c.asset_id}`) : null)} />
                    ))}
                  </div>
                ) : (
                  <FeedEmptyState message="No assets currently checked out" actionLabel="Check out an asset" actionPath="/assets/checkout" />
                )}
              </TabsContent>

              <TabsContent value="repair" className="mt-0">
                {activeRepairs.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {activeRepairs.map((r, i) => (
                      <FeedRow key={r.id} index={i} tag={r.asset?.asset_tag || r.asset?.asset_id || ""} col2={r.issue_description?.slice(0, 30) || "—"} date={r.created_at || undefined} onClick={() => navigate(`/assets/repairs/detail/${r.id}`)} />
                    ))}
                  </div>
                ) : (
                  <FeedEmptyState message="No assets in repair" />
                )}
              </TabsContent>

              <TabsContent value="new" className="mt-0">
                {newAssets.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {newAssets.map((a, i) => (
                      <FeedRow key={a.id} index={i} tag={a.asset_tag || a.asset_id || ""} col2={a.category?.name || "—"} date={a.created_at || undefined} onClick={() => navigate(`/assets/detail/${a.asset_tag || a.asset_id || a.id}`)} />
                    ))}
                  </div>
                ) : (
                  <FeedEmptyState message="No new assets in 7 days" actionLabel="Add an asset" actionPath="/assets/add" />
                )}
              </TabsContent>

              <TabsContent value="disposed" className="mt-0">
                {disposedAssets.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {disposedAssets.map((a, i) => (
                      <FeedRow key={a.id} index={i} tag={a.asset_tag || a.asset_id || ""} col2={a.category?.name || "—"} date={a.updated_at || undefined} onClick={() => navigate(`/assets/detail/${a.asset_tag || a.asset_id || a.id}`)} />
                    ))}
                  </div>
                ) : (
                  <FeedEmptyState message="No disposed assets" />
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
        <div className="px-2.5 py-1 border-t shrink-0">
          <Button variant="ghost" size="sm" className="w-full text-xs h-6 group/btn" onClick={() => navigate("/assets/allassets")}>
            View All Assets <ChevronRight className="h-3 w-3 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}