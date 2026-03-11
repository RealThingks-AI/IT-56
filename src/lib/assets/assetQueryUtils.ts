import { QueryClient } from "@tanstack/react-query";

export type AssetInvalidationScope = "all" | "list" | "detail" | "dashboard" | "feed";

const SCOPE_KEYS: Record<AssetInvalidationScope, string[][]> = {
  list: [
    ["helpdesk-assets"],
    ["helpdesk-assets-count"],
    ["itam-assets"],
    ["itam-assets-available"],
    ["itam-assets-for-disposal"],
    ["employee-asset-counts"],
    ["employee-assets"],
  ],
  detail: [
    ["itam-asset-detail"],
    ["asset-history"],
    ["asset-events"],
  ],
  dashboard: [
    ["itam-assets-dashboard-full"],
    ["itam-inactive-assets"],
    ["itam-licenses-dashboard"],
    ["itam-maintenance-due"],
    ["asset-log-stats"],
    ["asset-logs"],
  ],
  feed: [
    ["itam-recent-checkins"],
    ["itam-recent-checkouts"],
    ["itam-active-repairs"],
    ["itam-overdue-assignments"],
    ["itam-active-assignments"],
  ],
  all: [], // handled below
};

/**
 * Invalidates asset-related queries scoped to reduce unnecessary refetches.
 * Default scope "all" invalidates everything.
 */
export const invalidateAllAssetQueries = (
  queryClient: QueryClient,
  scope: AssetInvalidationScope = "all"
) => {
  if (scope === "all") {
    Object.values(SCOPE_KEYS).forEach((keys) =>
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
    );
    // Additional keys only needed for full invalidation
    queryClient.invalidateQueries({ queryKey: ["itam-expiring-warranties"] });
    queryClient.invalidateQueries({ queryKey: ["asset-checkout-validation"] });
    queryClient.invalidateQueries({ queryKey: ["users-map-logs"] });
    queryClient.invalidateQueries({ queryKey: ["itam-repairs"] });
  } else {
    SCOPE_KEYS[scope].forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key })
    );
  }
};
