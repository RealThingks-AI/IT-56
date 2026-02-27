import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportCard } from "@/components/helpdesk/assets/reports/ReportCard";
import { useAssetReportsData } from "@/hooks/useAssetReportsData";
import { Loader2, Package, ClipboardCheck, LogOut, Receipt, Wrench, Activity, FileText, Image, MapPin, Building2, Key, Calendar, Users, Trash2, Edit, Plus, ArrowRightLeft, AlertTriangle, Clock, Shield, Archive, Search, CheckCircle, DollarSign, Gift, Truck } from "lucide-react";
import * as generators from "@/lib/assetReportGenerators";

const AssetReports = () => {
  const [searchParams] = useSearchParams();
  const activeType = searchParams.get("type") || "asset";
  const { data: reportData, isLoading } = useAssetReportsData();
  const [searchTerm, setSearchTerm] = useState("");

  // Report categories configuration
  const reportCategories = useMemo(() => {
    if (!reportData) return [];

    const data = reportData;

    // Helper to safely check for property existence
    const hasProperty = (arr: any[], prop: string) => arr.filter(a => a && (a as any)[prop]).length;

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
          { id: "by-warranty", title: "By Warranty Info", description: "Assets with warranty details", icon: Shield, count: hasProperty(data.assets, 'warranty_expiry'), action: () => generators.generateAssetByWarrantyReport(data) },
          { id: "by-linked", title: "By Linked Assets", description: "Parent-child asset relationships", icon: ArrowRightLeft, count: 0, action: () => generators.generateAssetByLinkedReport(data) },
        ]
      },
      {
        id: "audit",
        title: "Audit Reports",
        icon: ClipboardCheck,
        reports: [
          { id: "audit-by-tag", title: "By Asset Tag", description: "Audit history for specific assets", icon: Package, count: data.assetHistory.filter(h => h.action === "audit").length, action: () => generators.generateAuditByAssetTagReport(data) },
          { id: "audit-by-date", title: "By Audit Date", description: "Audit records by date range", icon: Calendar, count: data.assetHistory.filter(h => h.action === "audit").length, action: () => generators.generateAuditByDateReport(data) },
          { id: "audit-by-site", title: "By Site/Location", description: "Audits grouped by location", icon: MapPin, count: data.assetHistory.filter(h => h.action === "audit").length, action: () => generators.generateAuditBySiteReport(data) },
          { id: "non-audited", title: "Non-Audited Assets", description: "Assets missing audit records", icon: AlertTriangle, count: data.assets.length, action: () => generators.generateNonAuditedAssetsReport(data) },
        ]
      },
      {
        id: "checkout",
        title: "Check-Out Reports",
        icon: LogOut,
        reports: [
          { id: "checkout-by-person", title: "By Person/Employee", description: "Assignments by user", icon: Users, count: data.assignments.filter(a => !a.returned_at).length, action: () => generators.generateCheckoutByPersonReport(data) },
          { id: "checkout-by-tag", title: "By Asset Tag", description: "Check-out history by asset", icon: Package, count: data.assignments.length, action: () => generators.generateCheckoutByAssetReport(data) },
          { id: "checkout-by-due", title: "By Due Date", description: "Assets with upcoming return dates", icon: Calendar, count: 0, action: () => generators.generateCheckoutByDueDateReport(data) },
          { id: "checkout-past-due", title: "By Past Due", description: "Overdue assignments", icon: Clock, count: 0, action: () => generators.generateCheckoutPastDueReport(data) },
          { id: "checkout-by-site", title: "By Site/Location", description: "Check-outs by location", icon: MapPin, count: data.assignments.filter(a => !a.returned_at).length, action: () => generators.generateCheckoutBySiteReport(data) },
          { id: "checkout-timeframe", title: "In a Time Frame", description: "Check-outs within date range", icon: Calendar, count: data.assignments.length, action: () => generators.generateCheckoutByAssetReport(data) },
        ]
      },
      {
        id: "contract",
        title: "Contract Reports",
        icon: Receipt,
        reports: [
          { id: "by-contract", title: "By Contract", description: "All contracts list", icon: Receipt, count: data.licenses.length, action: () => generators.generateContractByContractReport(data) },
          { id: "contract-by-tag", title: "By Asset Tag", description: "Assets linked to contracts", icon: Package, count: hasProperty(data.assets, 'warranty_expiry'), action: () => generators.generateContractByAssetReport(data) },
          { id: "software-license", title: "Software License", description: "License-specific reports", icon: Key, count: data.licenses.filter(l => (l as any).license_type === "software").length, action: () => generators.generateSoftwareLicenseReport(data) },
        ]
      },
      {
        id: "maintenance",
        title: "Maintenance Reports",
        icon: Wrench,
        reports: [
          { id: "maint-by-tag", title: "By Asset Tag", description: "Maintenance by asset", icon: Package, count: data.maintenanceSchedules.length + data.repairs.length, action: () => generators.generateMaintenanceByAssetReport(data) },
          { id: "maint-by-person", title: "By Assigned Person", description: "Maintenance by technician", icon: Users, count: data.maintenanceSchedules.length, action: () => generators.generateMaintenanceByPersonReport(data) },
          { id: "maint-history-tag", title: "History by Asset Tag", description: "Complete maintenance history", icon: FileText, count: data.maintenanceSchedules.length + data.repairs.length, action: () => generators.generateMaintenanceByAssetReport(data) },
          { id: "maint-history-date", title: "History by Date", description: "Maintenance timeline", icon: Calendar, count: data.maintenanceSchedules.length + data.repairs.length, action: () => generators.generateMaintenanceHistoryByDateReport(data) },
          { id: "maint-past-due", title: "Past Due", description: "Overdue maintenance tasks", icon: Clock, count: data.maintenanceSchedules.filter(m => m.next_due_date && new Date(m.next_due_date) < new Date()).length, action: () => generators.generateMaintenancePastDueReport(data) },
        ]
      },
        {
        id: "status",
        title: "Status Reports",
        icon: Activity,
        reports: [
          { id: "under-repair", title: "Assets Under Repair", description: "Currently in maintenance", icon: Wrench, count: data.assets.filter(a => (a as any).status?.toLowerCase() === "maintenance").length, action: () => generators.generateStatusReport(data, "maintenance", "assets_under_repair") },
          { id: "retired", title: "Retired Assets", description: "Status = retired", icon: AlertTriangle, count: data.assets.filter(a => (a as any).status?.toLowerCase() === "retired").length, action: () => generators.generateStatusReport(data, "retired", "retired_assets") },
          { id: "disposed", title: "Disposed Assets", description: "Disposed assets", icon: Trash2, count: data.assets.filter(a => (a as any).status?.toLowerCase() === "disposed").length, action: () => generators.generateStatusReport(data, "disposed", "disposed_assets") },
          { id: "available", title: "Available Assets", description: "Available/unassigned assets", icon: CheckCircle, count: data.assets.filter(a => (a as any).status?.toLowerCase() === "available").length, action: () => generators.generateStatusReport(data, "available", "available_assets") },
          { id: "in-use", title: "In Use Assets", description: "Currently assigned/in use", icon: Users, count: data.assets.filter(a => (a as any).status?.toLowerCase() === "in_use").length, action: () => generators.generateStatusReport(data, "in_use", "in_use_assets") },
          { id: "lost-missing", title: "Lost/Missing Assets", description: "Missing assets", icon: Search, count: data.assets.filter(a => (a as any).status?.toLowerCase() === "lost").length, action: () => generators.generateStatusReport(data, "lost", "lost_assets") },
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

  // Filter report categories by search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return reportCategories;
    const term = searchTerm.toLowerCase();
    return reportCategories
      .map(cat => ({
        ...cat,
        reports: cat.reports.filter(r =>
          r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term)
        ),
      }))
      .filter(cat => cat.reports.length > 0);
  }, [reportCategories, searchTerm]);

  return (
    <div className="space-y-4">
      <div>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <Skeleton className="h-5 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-[120px] rounded-lg" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="relative max-w-sm mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No reports match "{searchTerm}"</p>
              </div>
            ) : (
              <Accordion type="single" collapsible defaultValue={defaultOpen} className="space-y-2">
                {filteredCategories.map((category) => (
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
          </>
        )}
      </div>
    </div>
  );
};

export default AssetReports;
