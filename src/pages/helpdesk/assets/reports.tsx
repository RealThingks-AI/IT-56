import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ReportCard } from "@/components/helpdesk/assets/reports/ReportCard";
import { useAssetReportsData } from "@/hooks/useAssetReportsData";
import { Loader2, Package, ClipboardCheck, LogOut, Receipt, Wrench, Activity, FileText, Image, MapPin, Building2, Key, Calendar, Users, Trash2, Edit, Plus, ArrowRightLeft, AlertTriangle, Clock, Shield, TrendingDown, Archive, Gift, DollarSign, Truck, Search } from "lucide-react";
import * as generators from "@/lib/assetReportGenerators";

const AssetReports = () => {
  const [searchParams] = useSearchParams();
  const activeType = searchParams.get("type") || "asset";
  const { data: reportData, isLoading } = useAssetReportsData();

  // Report categories configuration
  const reportCategories = useMemo(() => {
    if (!reportData) return [];

    const data = reportData;

    return [
      {
        id: "asset",
        title: "Asset Reports",
        icon: Package,
        reports: [
          { id: "by-tag", title: "By Asset Tag", description: "List all assets sorted by tag", icon: Package, count: data.assets.length, action: () => generators.generateAssetByTagReport(data) },
          { id: "by-tag-pictures", title: "By Tag with Pictures", description: "Assets with photo thumbnails", icon: Image, count: data.assets.length, action: () => generators.generateAssetByTagWithPicturesReport(data) },
          { id: "by-category", title: "By Category", description: "Group assets by category", icon: Package, count: data.assets.length, action: () => generators.generateAssetByCategoryReport(data) },
          { id: "by-site", title: "By Site/Location", description: "Assets by physical location", icon: MapPin, count: data.assets.length, action: () => generators.generateAssetBySiteReport(data) },
          { id: "by-department", title: "By Department", description: "Assets grouped by department", icon: Building2, count: data.assets.length, action: () => generators.generateAssetByDepartmentReport(data) },
          { id: "by-warranty", title: "By Warranty Info", description: "Assets with warranty details", icon: Shield, count: data.assets.filter(a => a.warranty_expiry).length, action: () => generators.generateAssetByWarrantyReport(data) },
          { id: "by-linked", title: "By Linked Assets", description: "Parent-child asset relationships", icon: ArrowRightLeft, count: data.assets.filter(a => a.parent_asset_id).length, action: () => generators.generateAssetByLinkedReport(data) },
        ]
      },
      {
        id: "audit",
        title: "Audit Reports",
        icon: ClipboardCheck,
        reports: [
          { id: "audit-by-tag", title: "By Asset Tag", description: "Audit history for specific assets", icon: Package, count: data.assetHistory.filter(h => h.action === "audit").length, action: () => generators.generateAuditByAssetTagReport(data) },
          { id: "audit-by-date", title: "By Audit Date", description: "Audit records by date range", icon: Calendar, count: data.assetHistory.filter(h => h.action === "audit").length, action: () => generators.generateAuditByDateReport(data) },
          { id: "audit-by-site", title: "By Site/Location", description: "Audits grouped by location", icon: MapPin, count: data.assetHistory.filter(h => h.action === "audit").length, action: () => generators.generateAuditByDateReport(data) },
          { id: "non-audited", title: "Non-Audited Assets", description: "Assets missing audit records", icon: AlertTriangle, count: data.assets.length, action: () => generators.generateNonAuditedAssetsReport(data) },
          { id: "location-discrepancy", title: "Location Discrepancy", description: "Assets with location mismatches", icon: Search, count: 0, action: () => {} },
          { id: "audit-by-funding", title: "By Funding", description: "Assets by funding source", icon: DollarSign, count: 0, action: () => {} },
          { id: "non-audited-funding", title: "Non-Audited Funding", description: "Funding sources not audited", icon: AlertTriangle, count: 0, action: () => {} },
        ]
      },
      {
        id: "checkout",
        title: "Check-Out Reports",
        icon: LogOut,
        reports: [
          { id: "checkout-by-person", title: "By Person/Employee", description: "Assignments by user", icon: Users, count: data.assignments.filter(a => !a.returned_at).length, action: () => generators.generateCheckoutByPersonReport(data) },
          { id: "checkout-by-tag", title: "By Asset Tag", description: "Check-out history by asset", icon: Package, count: data.assignments.length, action: () => generators.generateCheckoutByAssetReport(data) },
          { id: "checkout-by-due", title: "By Due Date", description: "Assets with upcoming return dates", icon: Calendar, count: data.assignments.filter(a => !a.returned_at && a.due_date).length, action: () => generators.generateCheckoutByDueDateReport(data) },
          { id: "checkout-past-due", title: "By Past Due", description: "Overdue assignments", icon: Clock, count: data.assignments.filter(a => !a.returned_at && a.due_date && new Date(a.due_date) < new Date()).length, action: () => generators.generateCheckoutPastDueReport(data) },
          { id: "checkout-by-site", title: "By Site/Location", description: "Check-outs by location", icon: MapPin, count: data.assignments.filter(a => !a.returned_at).length, action: () => generators.generateCheckoutByPersonReport(data) },
          { id: "checkout-timeframe", title: "In a Time Frame", description: "Check-outs within date range", icon: Calendar, count: data.assignments.length, action: () => generators.generateCheckoutByAssetReport(data) },
        ]
      },
      {
        id: "contract",
        title: "Contract Reports",
        icon: Receipt,
        reports: [
          { id: "by-contract", title: "By Contract", description: "All contracts list", icon: Receipt, count: data.licenses.length, action: () => generators.generateContractByContractReport(data) },
          { id: "contract-by-tag", title: "By Asset Tag", description: "Assets linked to contracts", icon: Package, count: data.assets.filter(a => a.warranty_expiry).length, action: () => generators.generateContractByAssetReport(data) },
          { id: "software-license", title: "Software License", description: "License-specific reports", icon: Key, count: data.licenses.filter(l => l.license_type === "software").length, action: () => generators.generateSoftwareLicenseReport(data) },
        ]
      },
      {
        id: "maintenance",
        title: "Maintenance Reports",
        icon: Wrench,
        reports: [
          { id: "maint-by-tag", title: "By Asset Tag", description: "Maintenance by asset", icon: Package, count: data.maintenanceSchedules.length + data.repairs.length, action: () => generators.generateMaintenanceByAssetReport(data) },
          { id: "maint-by-person", title: "By Assigned Person", description: "Maintenance by technician", icon: Users, count: data.maintenanceSchedules.length, action: () => generators.generateMaintenanceByAssetReport(data) },
          { id: "maint-history-tag", title: "History by Asset Tag", description: "Complete maintenance history", icon: FileText, count: data.maintenanceSchedules.length + data.repairs.length, action: () => generators.generateMaintenanceByAssetReport(data) },
          { id: "maint-history-date", title: "History by Date", description: "Maintenance timeline", icon: Calendar, count: data.maintenanceSchedules.length + data.repairs.length, action: () => generators.generateMaintenanceByAssetReport(data) },
          { id: "maint-past-due", title: "Past Due", description: "Overdue maintenance tasks", icon: Clock, count: data.maintenanceSchedules.filter(m => m.status !== "completed" && m.scheduled_date && new Date(m.scheduled_date) < new Date()).length, action: () => generators.generateMaintenancePastDueReport(data) },
        ]
      },
      {
        id: "status",
        title: "Status Reports",
        icon: Activity,
        reports: [
          { id: "under-repair", title: "Assets Under Repair", description: "Currently in repair", icon: Wrench, count: data.assets.filter(a => a.status?.toLowerCase() === "repair").length, action: () => generators.generateStatusReport(data, "repair", "assets_under_repair") },
          { id: "broken", title: "Broken Assets", description: "Status = broken", icon: AlertTriangle, count: data.assets.filter(a => a.status?.toLowerCase() === "broken").length, action: () => generators.generateStatusReport(data, "broken", "broken_assets") },
          { id: "disposed", title: "Disposed Assets", description: "Disposed/retired assets", icon: Trash2, count: data.assets.filter(a => a.status?.toLowerCase() === "disposed").length, action: () => generators.generateStatusReport(data, "disposed", "disposed_assets") },
          { id: "donated", title: "Donated Assets", description: "Donated assets", icon: Gift, count: data.assets.filter(a => a.status?.toLowerCase() === "donated").length, action: () => generators.generateStatusReport(data, "donated", "donated_assets") },
          { id: "leased", title: "Leased Assets", description: "Leased equipment", icon: Truck, count: data.assets.filter(a => a.status?.toLowerCase() === "leased").length, action: () => generators.generateStatusReport(data, "leased", "leased_assets") },
          { id: "lost-missing", title: "Lost/Missing Assets", description: "Missing assets", icon: Search, count: data.assets.filter(a => a.status?.toLowerCase() === "lost" || a.status?.toLowerCase() === "missing").length, action: () => generators.generateStatusReport(data, "lost", "lost_assets") },
          { id: "sold", title: "Sold Assets", description: "Sold assets", icon: DollarSign, count: data.assets.filter(a => a.status?.toLowerCase() === "sold").length, action: () => generators.generateStatusReport(data, "sold", "sold_assets") },
        ]
      },
      {
        id: "transaction",
        title: "Transaction Reports",
        icon: FileText,
        reports: [
          { id: "txn-add", title: "Add Assets", description: "Asset creation history", icon: Plus, count: data.assetHistory.filter(h => h.action === "create" || h.action === "add").length, action: () => generators.generateTransactionReport(data, "create", "add_assets") },
          { id: "txn-broken", title: "Broken Assets", description: "Status change to broken", icon: AlertTriangle, count: data.assetHistory.filter(h => h.action === "broken").length, action: () => generators.generateTransactionReport(data, "broken", "broken_transactions") },
          { id: "txn-checkout", title: "Checkout/Checkin", description: "Assignment transactions", icon: ArrowRightLeft, count: data.assetHistory.filter(h => h.action === "checkout" || h.action === "checkin").length, action: () => generators.generateTransactionReport(data, "checkout", "checkout_transactions") },
          { id: "txn-dispose", title: "Dispose Assets", description: "Disposal transactions", icon: Trash2, count: data.assetHistory.filter(h => h.action === "dispose").length, action: () => generators.generateTransactionReport(data, "dispose", "dispose_transactions") },
          { id: "txn-donate", title: "Donate Assets", description: "Donation transactions", icon: Gift, count: data.assetHistory.filter(h => h.action === "donate").length, action: () => generators.generateTransactionReport(data, "donate", "donate_transactions") },
          { id: "txn-edit", title: "Edit Assets", description: "Modification history", icon: Edit, count: data.assetHistory.filter(h => h.action === "edit" || h.action === "update").length, action: () => generators.generateTransactionReport(data, "update", "edit_transactions") },
          { id: "txn-lease", title: "Lease out/Lease return", description: "Lease transactions", icon: Truck, count: data.assetHistory.filter(h => h.action === "lease").length, action: () => generators.generateTransactionReport(data, "lease", "lease_transactions") },
          { id: "txn-lost", title: "Lost/Missing Assets", description: "Loss reports", icon: Search, count: data.assetHistory.filter(h => h.action === "lost").length, action: () => generators.generateTransactionReport(data, "lost", "lost_transactions") },
          { id: "txn-move", title: "Move Assets", description: "Location changes", icon: MapPin, count: data.assetHistory.filter(h => h.action === "move").length, action: () => generators.generateTransactionReport(data, "move", "move_transactions") },
          { id: "txn-repair", title: "Repair Assets", description: "Repair transactions", icon: Wrench, count: data.assetHistory.filter(h => h.action === "repair").length, action: () => generators.generateTransactionReport(data, "repair", "repair_transactions") },
          { id: "txn-reserve", title: "Reserve Assets", description: "Reservation history", icon: Calendar, count: data.assetHistory.filter(h => h.action === "reserve").length, action: () => generators.generateTransactionReport(data, "reserve", "reserve_transactions") },
          { id: "txn-sell", title: "Sell Assets", description: "Sale transactions", icon: DollarSign, count: data.assetHistory.filter(h => h.action === "sell").length, action: () => generators.generateTransactionReport(data, "sell", "sell_transactions") },
          { id: "txn-history", title: "Transaction History", description: "Complete transaction log", icon: FileText, count: data.assetHistory.length, action: () => generators.generateTransactionHistoryReport(data) },
          { id: "txn-by-user", title: "Actions by Users", description: "User activity log", icon: Users, count: data.assetHistory.length, action: () => generators.generateActionsByUserReport(data) },
          { id: "txn-deleted", title: "Deleted Assets", description: "Deletion history", icon: Archive, count: data.assetHistory.filter(h => h.action === "delete").length, action: () => generators.generateTransactionReport(data, "delete", "deleted_assets") },
        ]
      }
    ];
  }, [reportData]);

  // Find active category based on URL param
  const defaultOpen = reportCategories.find(c => c.id === activeType)?.id || "asset";

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3">
        <div className="mb-4">
          <h1 className="text-lg font-semibold">Asset Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and export comprehensive asset management reports</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Accordion type="single" collapsible defaultValue={defaultOpen} className="space-y-2">
            {reportCategories.map((category) => (
              <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <category.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{category.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({category.reports.length} reports)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {category.reports.map((report) => (
                      <ReportCard
                        key={report.id}
                        title={report.title}
                        description={report.description}
                        icon={report.icon}
                        count={report.count}
                        onGenerate={report.action}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default AssetReports;
