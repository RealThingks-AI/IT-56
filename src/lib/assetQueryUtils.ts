import { QueryClient } from "@tanstack/react-query";

/**
 * Invalidates all asset-related queries to ensure consistent data across the app.
 * Use this after any mutation that modifies asset data (check-in, check-out, dispose, delete, etc.)
 */
export const invalidateAllAssetQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
  queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
  queryClient.invalidateQueries({ queryKey: ["itam-asset-detail"] });
  queryClient.invalidateQueries({ queryKey: ["itam-assets-dashboard-full"] });
  queryClient.invalidateQueries({ queryKey: ["itam-recent-checkins"] });
  queryClient.invalidateQueries({ queryKey: ["itam-recent-checkouts"] });
  queryClient.invalidateQueries({ queryKey: ["itam-active-assignments"] });
  queryClient.invalidateQueries({ queryKey: ["employee-asset-counts"] });
  queryClient.invalidateQueries({ queryKey: ["employee-assets"] });
  queryClient.invalidateQueries({ queryKey: ["asset-history"] });
  queryClient.invalidateQueries({ queryKey: ["asset-events"] });
  queryClient.invalidateQueries({ queryKey: ["itam-repairs"] });
  queryClient.invalidateQueries({ queryKey: ["itam-assets"] });
  queryClient.invalidateQueries({ queryKey: ["itam-assets-for-disposal"] });
  queryClient.invalidateQueries({ queryKey: ["itam-assets-available"] });
  queryClient.invalidateQueries({ queryKey: ["asset-log-stats"] });
  queryClient.invalidateQueries({ queryKey: ["asset-logs"] });
  queryClient.invalidateQueries({ queryKey: ["itam-checkin-rows"] });
  queryClient.invalidateQueries({ queryKey: ["itam-new-assets"] });
  queryClient.invalidateQueries({ queryKey: ["itam-disposed-assets"] });
  queryClient.invalidateQueries({ queryKey: ["itam-lost-assets"] });
  queryClient.invalidateQueries({ queryKey: ["itam-active-repairs"] });
  queryClient.invalidateQueries({ queryKey: ["itam-overdue-assignments"] });
  queryClient.invalidateQueries({ queryKey: ["users-map-logs"] });
  queryClient.invalidateQueries({ queryKey: ["itam-expiring-warranties"] });
  queryClient.invalidateQueries({ queryKey: ["asset-checkout-validation"] });
};
