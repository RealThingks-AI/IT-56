import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganisationProvider } from "./contexts/OrganisationContext";
import { SystemSettingsProvider } from "./contexts/SystemSettingsContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { PageProtectedRoute } from "./components/PageProtectedRoute";

// Eagerly loaded (small, critical components)
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import Login from "./pages/Login";

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

// Lazy loaded components - Main Layout
const HelpdeskLayout = lazy(() => import("./pages/helpdesk/layout"));
const HelpdeskDashboard = lazy(() => import("./pages/helpdesk/dashboard"));

// Lazy loaded - Tickets
const HelpdeskTickets = lazy(() => import("./pages/helpdesk/tickets/index"));
const CreateTicket = lazy(() => import("./pages/helpdesk/tickets/create"));
const TicketDetail = lazy(() => import("./pages/helpdesk/tickets/[id]"));
const HelpdeskProblemDetail = lazy(() => import("./pages/helpdesk/problems/[id]"));
const AssignmentRules = lazy(() => import("./pages/helpdesk/tickets/assignment-rules"));

// Lazy loaded - Assets
const HelpdeskAssets = lazy(() => import("./pages/helpdesk/assets"));
const AssetDetail = lazy(() => import("./pages/helpdesk/assets/detail/[assetId]"));
const AssetReports = lazy(() => import("./pages/helpdesk/assets/reports"));
const AllAssets = lazy(() => import("./pages/helpdesk/assets/allassets"));
// AssetSetup removed - consolidated into Advanced page
const AssetDashboard = lazy(() => import("./pages/helpdesk/assets/dashboard"));
const AssetAlerts = lazy(() => import("./pages/helpdesk/assets/alerts/index"));
const AssetCheckout = lazy(() => import("./pages/helpdesk/assets/checkout"));
const AssetCheckin = lazy(() => import("./pages/helpdesk/assets/checkin"));
const AssetDispose = lazy(() => import("./pages/helpdesk/assets/dispose"));
const AssetReserve = lazy(() => import("./pages/helpdesk/assets/reserve"));
const AddAsset = lazy(() => import("./pages/helpdesk/assets/add"));
const MaintenancesList = lazy(() => import("./pages/helpdesk/assets/lists/maintenances"));
const WarrantiesList = lazy(() => import("./pages/helpdesk/assets/lists/warranties"));
const ContractsList = lazy(() => import("./pages/helpdesk/assets/lists/contracts"));
const AssetAdvancedPage = lazy(() => import("./pages/helpdesk/assets/advanced/index"));
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
const AssetAudit = lazy(() => import("./pages/helpdesk/assets/audit/index"));
const AssetsBulkActions = lazy(() => import("./pages/helpdesk/assets/explore/bulk-actions"));
const AssetsReports = lazy(() => import("./pages/helpdesk/assets/explore/reports"));
const AssetsImportExport = lazy(() => import("./pages/helpdesk/assets/import-export"));
const PurchaseOrdersList = lazy(() => import("./pages/helpdesk/assets/purchase-orders/index"));
const CreatePO = lazy(() => import("./pages/helpdesk/assets/purchase-orders/create-po"));
const PODetail = lazy(() => import("./pages/helpdesk/assets/purchase-orders/po-detail/[poId]"));

// Lazy loaded - Subscription
const HelpdeskSubscriptionLayout = lazy(() => import("./pages/helpdesk/subscription/index"));
const HelpdeskSubscriptionDashboard = lazy(() => import("./pages/helpdesk/subscription/dashboard"));
const HelpdeskSubscriptionTools = lazy(() => import("./pages/helpdesk/subscription/tools"));
const HelpdeskSubscriptionVendors = lazy(() => import("./pages/helpdesk/subscription/vendors"));
const HelpdeskSubscriptionLicenses = lazy(() => import("./pages/helpdesk/subscription/licenses"));
const HelpdeskSubscriptionPayments = lazy(() => import("./pages/helpdesk/subscription/payments"));

// Lazy loaded - System Updates
const HelpdeskSystemUpdates = lazy(() => import("./pages/helpdesk/system-updates"));
const SystemUpdatesSettings = lazy(() => import("./pages/helpdesk/system-updates/settings"));
const SystemUpdatesDevices = lazy(() => import("./pages/helpdesk/system-updates/devices"));
const SystemUpdatesUpdates = lazy(() => import("./pages/helpdesk/system-updates/updates"));

// Lazy loaded - Other Modules
const HelpdeskChanges = lazy(() => import("./pages/helpdesk/changes"));
const HelpdeskAdmin = lazy(() => import("./pages/helpdesk/admin"));
const HelpdeskSettings = lazy(() => import("./pages/helpdesk/settings"));
const AccountSettings = lazy(() => import("./pages/helpdesk/account"));
const HelpdeskReports = lazy(() => import("./pages/helpdesk/reports"));
const HelpdeskMonitoring = lazy(() => import("./pages/helpdesk/monitoring"));
const HelpdeskAudit = lazy(() => import("./pages/helpdesk/audit"));
const HelpdeskSLA = lazy(() => import("./pages/helpdesk/sla"));
const HelpdeskQueues = lazy(() => import("./pages/helpdesk/queues"));
const HelpdeskAutomation = lazy(() => import("./pages/helpdesk/automation"));

// Lazy loaded - Auth & Profile
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const Profile = lazy(() => import("./pages/Profile"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const ResetPasswordConfirm = lazy(() => import("./pages/ResetPasswordConfirm"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Status = lazy(() => import("./pages/Status"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,       // 2 minutes default
      gcTime: 10 * 60 * 1000,         // 10 minutes cache retention
      refetchOnWindowFocus: false,    // Don't refetch on tab switch
      refetchOnMount: false,          // Use cache on mount
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
            <OrganisationProvider>
              <SystemSettingsProvider>
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

                    {/* Profile */}
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

                    {/* Main App Routes - All under root */}
                    <Route path="/" element={<ProtectedRoute><HelpdeskLayout /></ProtectedRoute>}>
                      <Route index element={<HelpdeskDashboard />} />
                      
                      {/* Tickets - All roles */}
                      <Route path="tickets" element={<HelpdeskTickets />} />
                      <Route path="tickets/create" element={<CreateTicket />} />
                      <Route path="tickets/my" element={<HelpdeskTickets />} />
                      <Route path="tickets/unassigned" element={<HelpdeskTickets />} />
                      <Route path="tickets/all" element={<HelpdeskTickets />} />
                      <Route path="tickets/:id" element={<TicketDetail />} />
                      <Route path="problems" element={<HelpdeskTickets />} />
                      <Route path="problems/:id" element={<HelpdeskProblemDetail />} />
                      
                      {/* Assets - All roles for basic, admin/manager for advanced */}
                      <Route path="assets" element={<HelpdeskAssets />} />
                      <Route path="assets/dashboard" element={<AssetDashboard />} />
                      <Route path="assets/alerts" element={<AssetAlerts />} />
                      <Route path="assets/allassets" element={<AllAssets />} />
                      <Route path="assets/add" element={<AddAsset />} />
                      <Route path="assets/checkout" element={<AssetCheckout />} />
                      <Route path="assets/checkin" element={<AssetCheckin />} />
                      <Route path="assets/dispose" element={<AssetDispose />} />
                      <Route path="assets/reserve" element={<AssetReserve />} />
                      <Route path="assets/lists" element={<Navigate to="/assets/advanced?tab=maintenances" replace />} />
                      <Route path="assets/lists/maintenances" element={<Navigate to="/assets/advanced?tab=maintenances" replace />} />
                      <Route path="assets/lists/warranties" element={<Navigate to="/assets/advanced?tab=warranties" replace />} />
                      <Route path="assets/lists/contracts" element={<Navigate to="/assets/advanced?tab=contracts" replace />} />
                      <Route path="assets/advanced" element={<AssetAdvancedPage />} />
                      <Route path="assets/detail/:assetId" element={<AssetDetail />} />
                      <Route path="assets/reports" element={<RoleProtectedRoute allowedRoles={["admin", "manager"]}><AssetReports /></RoleProtectedRoute>} />
                      <Route path="assets/tools" element={<Navigate to="/assets/advanced?tab=tools" replace />} />
                      <Route path="assets/import-export" element={<AssetsImportExport />} />
                      <Route path="assets/setup" element={<Navigate to="/assets/advanced?tab=setup" replace />} />
                      <Route path="assets/depreciation" element={<RoleProtectedRoute allowedRoles={["admin", "manager"]}><DepreciationDashboard /></RoleProtectedRoute>} />
                      <Route path="assets/vendors" element={<VendorsList />} />
                      <Route path="assets/vendors/add-vendor" element={<AddVendor />} />
                      <Route path="assets/vendors/detail/:vendorId" element={<VendorDetail />} />
                      <Route path="assets/licenses" element={<LicensesList />} />
                      <Route path="assets/licenses/:licenseId" element={<LicenseDetail />} />
                      <Route path="assets/licenses/add-license" element={<AddLicense />} />
                      <Route path="assets/licenses/allocate" element={<AllocateLicense />} />
                      <Route path="assets/repairs" element={<RepairsList />} />
                      <Route path="assets/repairs/create" element={<CreateRepair />} />
                      <Route path="assets/repairs/detail/:repairId" element={<RepairDetail />} />
                      <Route path="assets/purchase-orders" element={<PurchaseOrdersList />} />
                      <Route path="assets/purchase-orders/create-po" element={<CreatePO />} />
                      <Route path="assets/purchase-orders/po-detail/:poId" element={<PODetail />} />
                      <Route path="assets/audit" element={<AssetAudit />} />
                      <Route path="assets/setup/fields-setup" element={<Navigate to="/assets/advanced?tab=setup" replace />} />
                      <Route path="assets/explore/bulk-actions" element={<AssetsBulkActions />} />
                      <Route path="assets/explore/reports" element={<RoleProtectedRoute allowedRoles={["admin", "manager"]}><AssetsReports /></RoleProtectedRoute>} />
                      
                      {/* Subscription - Database-driven access control */}
                      <Route path="subscription" element={<PageProtectedRoute route="/subscription"><HelpdeskSubscriptionLayout /></PageProtectedRoute>}>
                        <Route index element={<HelpdeskSubscriptionDashboard />} />
                        <Route path="tools" element={<HelpdeskSubscriptionTools />} />
                        <Route path="vendors" element={<HelpdeskSubscriptionVendors />} />
                        <Route path="licenses" element={<HelpdeskSubscriptionLicenses />} />
                        <Route path="payments" element={<HelpdeskSubscriptionPayments />} />
                      </Route>
                      
                      {/* System Updates - Database-driven access control */}
                      <Route path="system-updates" element={<PageProtectedRoute route="/system-updates"><HelpdeskSystemUpdates /></PageProtectedRoute>} />
                      <Route path="system-updates/settings" element={<RoleProtectedRoute allowedRoles={["admin"]}><SystemUpdatesSettings /></RoleProtectedRoute>} />
                      <Route path="system-updates/devices" element={<PageProtectedRoute route="/system-updates"><SystemUpdatesDevices /></PageProtectedRoute>} />
                      <Route path="system-updates/updates" element={<PageProtectedRoute route="/system-updates"><SystemUpdatesUpdates /></PageProtectedRoute>} />
                      
                      {/* Other Modules - Database-driven access control */}
                      <Route path="monitoring" element={<PageProtectedRoute route="/monitoring"><HelpdeskMonitoring /></PageProtectedRoute>} />
                      <Route path="reports" element={<PageProtectedRoute route="/reports"><HelpdeskReports /></PageProtectedRoute>} />
                      <Route path="audit" element={<PageProtectedRoute route="/audit"><HelpdeskAudit /></PageProtectedRoute>} />
                      <Route path="changes" element={<HelpdeskChanges />} />
                      
                      {/* Admin-only routes (keep hardcoded for security) */}
                      <Route path="sla" element={<RoleProtectedRoute allowedRoles={["admin"]}><HelpdeskSLA /></RoleProtectedRoute>} />
                      <Route path="queues" element={<RoleProtectedRoute allowedRoles={["admin"]}><HelpdeskQueues /></RoleProtectedRoute>} />
                      <Route path="automation" element={<RoleProtectedRoute allowedRoles={["admin"]}><HelpdeskAutomation /></RoleProtectedRoute>} />
                      <Route path="tickets/assignment-rules" element={<RoleProtectedRoute allowedRoles={["admin"]}><AssignmentRules /></RoleProtectedRoute>} />
                      <Route path="admin" element={<RoleProtectedRoute allowedRoles={["admin"]}><HelpdeskAdmin /></RoleProtectedRoute>} />
                      <Route path="settings" element={<PageProtectedRoute route="/settings"><HelpdeskSettings /></PageProtectedRoute>} />
                      
                      {/* Account - All authenticated users */}
                      <Route path="account" element={<AccountSettings />} />
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </SystemSettingsProvider>
            </OrganisationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
