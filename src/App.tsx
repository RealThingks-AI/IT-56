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
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
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
import SystemUpdatesLayout from "./layouts/SystemUpdatesLayout";
import AdminLayout from "./layouts/AdminLayout";

// Legacy layout kept for standalone routes
import HelpdeskLayout from "./pages/helpdesk/layout";

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

// Assets pages (eagerly loaded for perf)
import AllAssets from "./pages/helpdesk/assets/allassets";
import AssetDashboard from "./pages/helpdesk/assets/dashboard";
import AssetAdvancedPage from "./pages/helpdesk/assets/advanced/index";

const AssetDetail = lazy(() => import("./pages/helpdesk/assets/detail/[assetId]"));
const AssetReports = lazy(() => import("./pages/helpdesk/assets/reports"));
const AssetAlerts = lazy(() => import("./pages/helpdesk/assets/alerts/index"));
const AssetCheckout = lazy(() => import("./pages/helpdesk/assets/checkout"));
const AssetCheckin = lazy(() => import("./pages/helpdesk/assets/checkin"));
const AssetDispose = lazy(() => import("./pages/helpdesk/assets/dispose"));
const AssetReserve = lazy(() => import("./pages/helpdesk/assets/reserve"));
const AddAsset = lazy(() => import("./pages/helpdesk/assets/add"));
const DepreciationDashboard = lazy(() => import("./pages/helpdesk/assets/depreciation/index"));
const VendorsList = lazy(() => import("./pages/helpdesk/assets/vendors/index"));
const AddVendor = lazy(() => import("./pages/helpdesk/assets/vendors/add-vendor"));
const VendorDetail = lazy(() => import("./pages/helpdesk/assets/vendors/detail/[vendorId]"));
const LicensesList = lazy(() => import("./pages/helpdesk/assets/licenses/index"));
const LicenseDetail = lazy(() => import("./pages/helpdesk/assets/licenses/detail/[licenseId]"));
const AddLicense = lazy(() => import("./pages/helpdesk/assets/licenses/add-license"));
const AllocateLicense = lazy(() => import("./pages/helpdesk/assets/licenses/allocate"));
const RepairsList = lazy(() => import("./pages/helpdesk/assets/repairs/index"));
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
const HelpdeskSubscriptionVendors = lazy(() => import("./pages/helpdesk/subscription/vendors"));
const HelpdeskSubscriptionLicenses = lazy(() => import("./pages/helpdesk/subscription/licenses"));
const HelpdeskSubscriptionPayments = lazy(() => import("./pages/helpdesk/subscription/payments"));

// System Updates pages
const HelpdeskSystemUpdates = lazy(() => import("./pages/helpdesk/system-updates"));
const SystemUpdatesSettings = lazy(() => import("./pages/helpdesk/system-updates/settings"));
const SystemUpdatesDevices = lazy(() => import("./pages/helpdesk/system-updates/devices"));
const SystemUpdatesUpdates = lazy(() => import("./pages/helpdesk/system-updates/updates"));

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

// Auth
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const ResetPasswordConfirm = lazy(() => import("./pages/ResetPasswordConfirm"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Status = lazy(() => import("./pages/Status"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
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
          <AuthProvider>
            <SystemSettingsProvider>
              <AppErrorBoundary>
              <Suspense fallback={<PageLoader />}>
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
                  <Route path="/monitoring" element={<HelpdeskLayout />}>
                    <Route index element={<HelpdeskMonitoring />} />
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
                    <Route path="/assets/reserve" element={<AssetReserve />} />
                    <Route path="/assets/alerts" element={<AssetAlerts />} />
                    <Route path="/assets/advanced" element={<AssetAdvancedPage />} />
                    <Route path="/assets/detail/:assetId" element={<AssetDetail />} />
                    <Route path="/assets/reports" element={<AssetReports />} />
                    <Route path="/assets/import-export" element={<AssetsImportExport />} />
                    <Route path="/assets/depreciation" element={<DepreciationDashboard />} />
                    <Route path="/assets/vendors" element={<VendorsList />} />
                    <Route path="/assets/vendors/add-vendor" element={<AddVendor />} />
                    <Route path="/assets/vendors/detail/:vendorId" element={<VendorDetail />} />
                    <Route path="/assets/licenses" element={<LicensesList />} />
                    <Route path="/assets/licenses/add-license" element={<AddLicense />} />
                    <Route path="/assets/licenses/allocate" element={<AllocateLicense />} />
                    <Route path="/assets/licenses/:licenseId" element={<LicenseDetail />} />
                    <Route path="/assets/repairs" element={<RepairsList />} />
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
                    <Route path="/subscription/vendors" element={<HelpdeskSubscriptionVendors />} />
                    <Route path="/subscription/licenses" element={<HelpdeskSubscriptionLicenses />} />
                    <Route path="/subscription/payments" element={<HelpdeskSubscriptionPayments />} />
                    
                  </Route>

                  {/* ===== SYSTEM UPDATES MODULE ===== */}
                  <Route element={<SystemUpdatesLayout />}>
                    <Route path="/system-updates" element={<HelpdeskSystemUpdates />} />
                    <Route path="/system-updates/settings" element={<SystemUpdatesSettings />} />
                    <Route path="/system-updates/devices" element={<SystemUpdatesDevices />} />
                    <Route path="/system-updates/updates" element={<SystemUpdatesUpdates />} />
                    
                  </Route>

                  {/* ===== ADMIN MODULE ===== */}
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                    <Route path="/admin/logs" element={<AdminLogsPage />} />
                    <Route path="/admin/system" element={<AdminSystemPage />} />
                    <Route path="/admin/backup" element={<AdminBackupPage />} />
                    <Route path="/admin/reports" element={<AdminReportsPage />} />
                    
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
