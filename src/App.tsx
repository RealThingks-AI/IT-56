import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SystemSettingsProvider } from "./contexts/SystemSettingsContext";
import AppErrorBoundary from "./components/AppErrorBoundary";

// Eagerly loaded (small, critical)
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import Login from "./pages/Login";

const PageLoader = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Redirect component that preserves query params
const FieldsSetupRedirect = () => {
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section") || "sites";
  return <Navigate to={`/assets/advanced?tab=setup&section=${section}`} replace />;
};

// Module Launcher (new "/" page)
import ModuleLauncher from "./pages/ModuleLauncher";

// Module Layouts
import TicketsLayout from "./layouts/TicketsLayout";
import AssetsLayout from "./layouts/AssetsLayout";
import SubscriptionLayout from "./layouts/SubscriptionLayout";

import AdminLayout from "./layouts/AdminLayout";
import ITTasksLayout from "./layouts/ITTasksLayout";
import NetworkMonitoringLayout from "./layouts/NetworkMonitoringLayout";
import EndpointSecurityLayout from "./layouts/EndpointSecurityLayout";
import OnOffBoardingLayout from "./layouts/OnOffBoardingLayout";

// MonitoringLayout replaces the legacy HelpdeskLayout
import MonitoringLayout from "./layouts/MonitoringLayout";

// Tickets pages
const TicketsDashboard = lazy(() => import("./pages/helpdesk/tickets/dashboard"));
const TicketsList = lazy(() => import("./pages/helpdesk/tickets/list"));
const ProblemsPage = lazy(() => import("./pages/helpdesk/tickets/problems"));
const TicketSettings = lazy(() => import("./pages/helpdesk/tickets/settings"));
const TicketReports = lazy(() => import("./pages/helpdesk/tickets/reports"));
const ClosedArchive = lazy(() => import("./pages/helpdesk/tickets/closed-archive"));
const CreateTicket = lazy(() => import("./pages/helpdesk/tickets/create"));
const TicketDetail = lazy(() => import("./pages/helpdesk/tickets/[id]"));
const HelpdeskProblemDetail = lazy(() => import("./pages/helpdesk/problems/[id]"));
const AssignmentRules = lazy(() => import("./pages/helpdesk/tickets/assignment-rules"));
const LinkedProblems = lazy(() => import("./pages/helpdesk/tickets/linked-problems"));

// Assets pages — primary workflow pages eagerly loaded for instant navigation
import AllAssets from "./pages/helpdesk/assets/allassets";
import AssetDashboard from "./pages/helpdesk/assets/dashboard";
import AssetCheckout from "./pages/helpdesk/assets/checkout";
import AssetCheckin from "./pages/helpdesk/assets/checkin";
import AssetDispose from "./pages/helpdesk/assets/dispose";

import AssetEmployeesPage from "./pages/helpdesk/assets/employees";
import AssetVerification from "./pages/helpdesk/assets/verification/index";

// Assets pages — secondary, lazy-loaded
const AssetAdvancedPage = lazy(() => import("./pages/helpdesk/assets/advanced/index"));
const AssetDetail = lazy(() => import("./pages/helpdesk/assets/detail/[assetId]"));
const AssetReports = lazy(() => import("./pages/helpdesk/assets/reports"));
const AssetAlerts = lazy(() => import("./pages/helpdesk/assets/alerts/index"));
const AddAsset = lazy(() => import("./pages/helpdesk/assets/add"));
const DepreciationDashboard = lazy(() => import("./pages/helpdesk/assets/depreciation/index"));

const AddVendor = lazy(() => import("./pages/helpdesk/assets/vendors/add-vendor"));
const VendorDetail = lazy(() => import("./pages/helpdesk/assets/vendors/detail/[vendorId]"));

const CreateRepair = lazy(() => import("./pages/helpdesk/assets/repairs/create"));
const RepairDetail = lazy(() => import("./pages/helpdesk/assets/repairs/detail/[repairId]"));

const AssetLogs = lazy(() => import("./pages/helpdesk/assets/AssetLogsPage"));
const AssetsBulkActions = lazy(() => import("./pages/helpdesk/assets/explore/bulk-actions"));
const AssetsImportExport = lazy(() => import("./pages/helpdesk/assets/import-export"));
const PurchaseOrdersList = lazy(() => import("./pages/helpdesk/assets/purchase-orders/index"));
const CreatePO = lazy(() => import("./pages/helpdesk/assets/purchase-orders/create-po"));
const PODetail = lazy(() => import("./pages/helpdesk/assets/purchase-orders/po-detail/[poId]"));

// Subscription pages
const HelpdeskSubscriptionDashboard = lazy(() => import("./pages/helpdesk/subscription/dashboard"));
const HelpdeskSubscriptionTools = lazy(() => import("./pages/helpdesk/subscription/tools"));

const SubscriptionAdvanced = lazy(() => import("./pages/helpdesk/subscription/advanced"));
const SubscriptionDetail = lazy(() => import("./pages/helpdesk/subscription/detail/[subscriptionId]"));


// Lazy loaded - Other Modules
const HelpdeskChanges = lazy(() => import("./pages/helpdesk/changes"));
const HelpdeskMonitoring = lazy(() => import("./pages/helpdesk/monitoring"));
const AccountSettings = lazy(() => import("./pages/helpdesk/account"));
const HelpdeskSLA = lazy(() => import("./pages/helpdesk/sla"));
const HelpdeskQueues = lazy(() => import("./pages/helpdesk/queues"));
const HelpdeskAutomation = lazy(() => import("./pages/helpdesk/automation"));

// Admin pages
const AdminUsersPage = lazy(() => import("./pages/admin/users"));
const AdminLogsPage = lazy(() => import("./pages/admin/logs"));
const AdminSystemPage = lazy(() => import("./pages/admin/system"));
const AdminBackupPage = lazy(() => import("./pages/admin/backup"));
const AdminReportsPage = lazy(() => import("./pages/admin/reports"));
const AdminEmailPage = lazy(() => import("./pages/admin/email"));

// IT Tasks pages
const ITTasksDashboard = lazy(() => import("./pages/helpdesk/it-tasks/dashboard"));
const ITTasksAll = lazy(() => import("./pages/helpdesk/it-tasks/all-tasks"));
const ITTasksMy = lazy(() => import("./pages/helpdesk/it-tasks/my-tasks"));
const ITTasksKanban = lazy(() => import("./pages/helpdesk/it-tasks/kanban"));
const ITTasksReports = lazy(() => import("./pages/helpdesk/it-tasks/reports"));
const ITTasksActivity = lazy(() => import("./pages/helpdesk/it-tasks/activity"));
const ITTaskDetail = lazy(() => import("./pages/helpdesk/it-tasks/detail/[taskId]"));

// Network Monitoring pages
const NetworkDashboard = lazy(() => import("./pages/helpdesk/network-monitoring/dashboard"));
const NetworkDevices = lazy(() => import("./pages/helpdesk/network-monitoring/devices"));
const NetworkDeviceDetail = lazy(() => import("./pages/helpdesk/network-monitoring/device-detail/[deviceId]"));
const NetworkAlerts = lazy(() => import("./pages/helpdesk/network-monitoring/alerts"));
const NetworkPingLogs = lazy(() => import("./pages/helpdesk/network-monitoring/ping-logs"));
const NetworkReports = lazy(() => import("./pages/helpdesk/network-monitoring/reports"));

// Endpoint Security pages
const EndpointSecurityDashboard = lazy(() => import("./pages/helpdesk/endpoint-security/dashboard"));
const EndpointsList = lazy(() => import("./pages/helpdesk/endpoint-security/endpoints"));
const EndpointDetail = lazy(() => import("./pages/helpdesk/endpoint-security/endpoint-detail/[endpointId]"));
const EndpointCompliance = lazy(() => import("./pages/helpdesk/endpoint-security/compliance"));
const EndpointAlerts = lazy(() => import("./pages/helpdesk/endpoint-security/alerts"));
const EndpointScans = lazy(() => import("./pages/helpdesk/endpoint-security/scans"));
const EndpointReports = lazy(() => import("./pages/helpdesk/endpoint-security/reports"));
const PatchingDevices = lazy(() => import("./pages/helpdesk/endpoint-security/patching-devices"));
const PatchingUpdates = lazy(() => import("./pages/helpdesk/endpoint-security/patching-updates"));

// Onboarding/Offboarding pages
const OnOffDashboard = lazy(() => import("./pages/helpdesk/onoff-boarding/dashboard"));
const OnboardingPage = lazy(() => import("./pages/helpdesk/onoff-boarding/onboarding"));
const OffboardingPage = lazy(() => import("./pages/helpdesk/onoff-boarding/offboarding"));
const OnOffKanban = lazy(() => import("./pages/helpdesk/onoff-boarding/kanban"));
const WorkflowDetail = lazy(() => import("./pages/helpdesk/onoff-boarding/workflow-detail/[workflowId]"));
const WorkflowTemplates = lazy(() => import("./pages/helpdesk/onoff-boarding/templates"));
const OnOffReports = lazy(() => import("./pages/helpdesk/onoff-boarding/reports"));

// Auth
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const ResetPasswordConfirm = lazy(() => import("./pages/ResetPasswordConfirm"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Status = lazy(() => import("./pages/Status"));
const ConfirmAssets = lazy(() => import("./pages/ConfirmAssets"));
const ConfirmationResult = lazy(() => import("./pages/ConfirmationResult"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Fully public standalone routes - NO auth, NO sidebar */}
              <Route path="/confirm-assets/:token" element={<ConfirmAssets />} />
              <Route path="/confirmation-result" element={<ConfirmationResult />} />

              {/* Everything else goes through auth */}
              <Route path="/*" element={
                <AuthProvider>
                  <SystemSettingsProvider>
                    <AppErrorBoundary>
                    <Routes>
                  {/* Auth routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth" element={<Navigate to="/login" replace />} />
                  <Route path="/auth/confirm" element={<AuthConfirm />} />
                  <Route path="/password-reset" element={<PasswordReset />} />
                  <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />
                  <Route path="/access-denied" element={<AccessDenied />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/profile" element={<Navigate to="/account" replace />} />
                  <Route path="/notifications" element={<Notifications />} />

                  {/* Module Launcher — new home */}
                  <Route path="/" element={<ModuleLauncher />} />

                  {/* ===== TICKETS MODULE ===== */}
                  <Route element={<TicketsLayout />}>
                    <Route path="/tickets" element={<TicketsDashboard />} />
                    <Route path="/tickets/list" element={<TicketsList />} />
                    <Route path="/tickets/problems" element={<ProblemsPage />} />
                    <Route path="/tickets/settings" element={<TicketSettings />} />
                    <Route path="/tickets/reports" element={<TicketReports />} />
                    <Route path="/tickets/archive" element={<Navigate to="/tickets/closed-archive" replace />} />
                    <Route path="/tickets/closed-archive" element={<ClosedArchive />} />
                    <Route path="/tickets/create" element={<CreateTicket />} />
                    <Route path="/tickets/assignment-rules" element={<AssignmentRules />} />
                    <Route path="/tickets/linked-problems" element={<LinkedProblems />} />
                    <Route path="/tickets/:id" element={<TicketDetail />} />
                    
                    <Route path="/sla" element={<HelpdeskSLA />} />
                    <Route path="/queues" element={<HelpdeskQueues />} />
                    <Route path="/automation" element={<HelpdeskAutomation />} />
                    <Route path="/changes" element={<HelpdeskChanges />} />
                    <Route path="/problems/:id" element={<HelpdeskProblemDetail />} />
                  </Route>

                  {/* Monitoring (standalone module) */}
                  <Route element={<MonitoringLayout />}>
                    <Route path="/monitoring" element={<HelpdeskMonitoring />} />
                  </Route>

                  {/* ===== ASSETS MODULE ===== */}
                  <Route element={<AssetsLayout />}>
                    <Route path="/assets" element={<Navigate to="/assets/dashboard" replace />} />
                    <Route path="/assets/dashboard" element={<AssetDashboard />} />
                    <Route path="/assets/allassets" element={<AllAssets />} />
                    <Route path="/assets/add" element={<AddAsset />} />
                    <Route path="/assets/checkout" element={<AssetCheckout />} />
                    <Route path="/assets/checkin" element={<AssetCheckin />} />
                    <Route path="/assets/dispose" element={<AssetDispose />} />
                    
                    <Route path="/assets/alerts" element={<AssetAlerts />} />
                    <Route path="/assets/advanced" element={<AssetAdvancedPage />} />
                    <Route path="/assets/verification" element={<AssetVerification />} />
                    <Route path="/assets/employees" element={<AssetEmployeesPage />} />
                    <Route path="/assets/detail/:assetId" element={<AssetDetail />} />
                    <Route path="/assets/reports" element={<AssetReports />} />
                    <Route path="/assets/import-export" element={<Navigate to="/assets/advanced?tab=import-export" replace />} />
                    <Route path="/assets/depreciation" element={<DepreciationDashboard />} />
                    <Route path="/assets/vendors" element={<Navigate to="/assets/advanced?tab=vendors" replace />} />
                    <Route path="/assets/vendors/add-vendor" element={<AddVendor />} />
                    <Route path="/assets/vendors/detail/:vendorId" element={<VendorDetail />} />
                    <Route path="/assets/repairs" element={<Navigate to="/assets/advanced?tab=repairs" replace />} />
                    <Route path="/assets/repairs/create" element={<CreateRepair />} />
                    <Route path="/assets/repairs/detail/:repairId" element={<RepairDetail />} />
                    <Route path="/assets/purchase-orders" element={<PurchaseOrdersList />} />
                    <Route path="/assets/purchase-orders/create-po" element={<CreatePO />} />
                    <Route path="/assets/purchase-orders/po-detail/:poId" element={<PODetail />} />
                    
                    <Route path="/assets/logs" element={<AssetLogs />} />
                    <Route path="/assets/explore/bulk-actions" element={<AssetsBulkActions />} />
                    
                    {/* Legacy redirects */}
                    <Route path="/assets/lists" element={<Navigate to="/assets/advanced?tab=maintenances" replace />} />
                    <Route path="/assets/lists/maintenances" element={<Navigate to="/assets/advanced?tab=maintenances" replace />} />
                    <Route path="/assets/lists/warranties" element={<Navigate to="/assets/advanced?tab=warranties" replace />} />
                    <Route path="/assets/tools" element={<Navigate to="/assets/advanced?tab=tools" replace />} />
                    <Route path="/assets/setup" element={<Navigate to="/assets/advanced?tab=setup" replace />} />
                    <Route path="/assets/setup/fields-setup" element={<FieldsSetupRedirect />} />
                  </Route>

                  {/* ===== SUBSCRIPTION MODULE ===== */}
                  <Route element={<SubscriptionLayout />}>
                    <Route path="/subscription" element={<HelpdeskSubscriptionDashboard />} />
                    <Route path="/subscription/tools" element={<HelpdeskSubscriptionTools />} />
                    <Route path="/subscription/new" element={<Navigate to="/subscription/tools" replace />} />
                    <Route path="/subscription/advanced" element={<SubscriptionAdvanced />} />
                    <Route path="/subscription/detail/:subscriptionId" element={<SubscriptionDetail />} />
                    {/* Legacy redirects */}
                    <Route path="/subscription/licenses" element={<Navigate to="/subscription/advanced?tab=licenses" replace />} />
                    <Route path="/subscription/payments" element={<Navigate to="/subscription/advanced?tab=payments" replace />} />
                    <Route path="/subscription/vendors" element={<Navigate to="/subscription/advanced?tab=vendors" replace />} />
                    <Route path="/subscription/import-export" element={<Navigate to="/subscription/advanced?tab=import-export" replace />} />
                  </Route>

                  {/* System Updates redirects → Endpoint Security */}
                  <Route path="/system-updates" element={<Navigate to="/endpoint-security" replace />} />
                  <Route path="/system-updates/*" element={<Navigate to="/endpoint-security" replace />} />

                  {/* ===== ADMIN MODULE ===== */}
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                    <Route path="/admin/logs" element={<AdminLogsPage />} />
                    <Route path="/admin/system" element={<AdminSystemPage />} />
                    <Route path="/admin/backup" element={<AdminBackupPage />} />
                    <Route path="/admin/reports" element={<AdminReportsPage />} />
                    <Route path="/admin/email" element={<AdminEmailPage />} />
                    
                  </Route>

                  {/* ===== IT TASKS MODULE ===== */}
                  <Route element={<ITTasksLayout />}>
                    <Route path="/it-tasks" element={<ITTasksDashboard />} />
                    <Route path="/it-tasks/all" element={<ITTasksAll />} />
                    <Route path="/it-tasks/my-tasks" element={<ITTasksMy />} />
                    <Route path="/it-tasks/kanban" element={<ITTasksKanban />} />
                    <Route path="/it-tasks/reports" element={<ITTasksReports />} />
                    <Route path="/it-tasks/activity" element={<ITTasksActivity />} />
                    <Route path="/it-tasks/:taskId" element={<ITTaskDetail />} />
                  </Route>

                  {/* ===== NETWORK MONITORING MODULE ===== */}
                  <Route element={<NetworkMonitoringLayout />}>
                    <Route path="/network-monitoring" element={<NetworkDashboard />} />
                    <Route path="/network-monitoring/devices" element={<NetworkDevices />} />
                    <Route path="/network-monitoring/device-detail/:deviceId" element={<NetworkDeviceDetail />} />
                    <Route path="/network-monitoring/alerts" element={<NetworkAlerts />} />
                    <Route path="/network-monitoring/ping-logs" element={<NetworkPingLogs />} />
                    <Route path="/network-monitoring/reports" element={<NetworkReports />} />
                  </Route>

                  {/* ===== ENDPOINT SECURITY MODULE ===== */}
                  <Route element={<EndpointSecurityLayout />}>
                    <Route path="/endpoint-security" element={<EndpointSecurityDashboard />} />
                    <Route path="/endpoint-security/endpoints" element={<EndpointsList />} />
                    <Route path="/endpoint-security/endpoint-detail/:endpointId" element={<EndpointDetail />} />
                    <Route path="/endpoint-security/compliance" element={<EndpointCompliance />} />
                    <Route path="/endpoint-security/alerts" element={<EndpointAlerts />} />
                    <Route path="/endpoint-security/scans" element={<EndpointScans />} />
                    <Route path="/endpoint-security/reports" element={<EndpointReports />} />
                    <Route path="/endpoint-security/patching/devices" element={<PatchingDevices />} />
                    <Route path="/endpoint-security/patching/updates" element={<PatchingUpdates />} />
                  </Route>

                  {/* ===== ONBOARDING / OFFBOARDING MODULE ===== */}
                  <Route element={<OnOffBoardingLayout />}>
                    <Route path="/onoff-boarding" element={<OnOffDashboard />} />
                    <Route path="/onoff-boarding/onboarding" element={<OnboardingPage />} />
                    <Route path="/onoff-boarding/offboarding" element={<OffboardingPage />} />
                    <Route path="/onoff-boarding/kanban" element={<OnOffKanban />} />
                    <Route path="/onoff-boarding/workflow-detail/:workflowId" element={<WorkflowDetail />} />
                    <Route path="/onoff-boarding/templates" element={<WorkflowTemplates />} />
                    <Route path="/onoff-boarding/reports" element={<OnOffReports />} />
                  </Route>

                  {/* Legacy settings redirect to admin */}
                  <Route path="/settings" element={<Navigate to="/admin/users" replace />} />

                  {/* Account (standalone fallback) */}
                  <Route path="/account" element={<AccountSettings />} />

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </AppErrorBoundary>
            </SystemSettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
