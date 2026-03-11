import { useNavigate } from "react-router-dom";
import { AssetStatCard } from "@/components/helpdesk/assets/AssetStatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Package, DollarSign, CheckCircle2, ShoppingCart, AlertTriangle, Wrench,
  Calendar, Clock, Trash2, ShieldCheck, XCircle,
} from "lucide-react";
import type { DashboardAsset, OverdueAssignment } from "./types";

interface WidgetConfig {
  id: string;
  enabled: boolean;
}

interface StatWidgetsProps {
  assetsLoading: boolean;
  enabledWidgets: WidgetConfig[];
  gridColsClass: string;
  activeAssets: number;
  totalAssets: number;
  availableAssets: number;
  totalValue: number;
  hasMixedCurrencies: boolean;
  fiscalYearValue: number;
  fiscalYearPurchases: DashboardAsset[];
  checkedOutCount: number;
  underRepairCount: number;
  disposedCount: number;
  overdueAssignments: OverdueAssignment[];
  activeLicenses?: unknown[];
  expiringLicenses?: unknown[];
  expiringWarranties: DashboardAsset[];
  expiringLeases: DashboardAsset[];
  maintenanceDueCount: number;
  pendingConfirmationCount: number;
  deniedCount: number;
  formatCurrency: (amount: number, currency?: string) => string;
  assets: DashboardAsset[];
}

export function StatWidgets({
  assetsLoading,
  enabledWidgets,
  gridColsClass,
  activeAssets,
  totalAssets,
  availableAssets,
  totalValue,
  hasMixedCurrencies,
  fiscalYearValue,
  fiscalYearPurchases,
  checkedOutCount,
  underRepairCount,
  disposedCount,
  overdueAssignments,
  activeLicenses,
  expiringLicenses,
  expiringWarranties,
  expiringLeases,
  maintenanceDueCount,
  pendingConfirmationCount,
  deniedCount,
  formatCurrency,
  assets,
}: StatWidgetsProps) {
  const navigate = useNavigate();

  if (assetsLoading) {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5", gridColsClass)}>
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5", gridColsClass)}>
      {enabledWidgets.map((widget, index: number) => {
        const d = index * 20;
        switch (widget.id) {
          case "activeAssets":
            return <AssetStatCard key={widget.id} title="Active Assets" value={activeAssets} subtitle={`Total: ${totalAssets}`} icon={Package} iconBgColor="bg-blue-500" iconColor="text-white" onClick={() => navigate("/assets/allassets")} animationDelay={d} />;
          case "availableAssets":
            return <AssetStatCard key={widget.id} title="In Stock" value={availableAssets} subtitle={`Value: ${formatCurrency(assets.filter((a) => a.status === "available").reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0))}`} icon={CheckCircle2} iconBgColor="bg-green-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?status=available")} animationDelay={d} />;
          case "assetValue":
            return <AssetStatCard key={widget.id} title="Total Value" value={formatCurrency(totalValue)} subtitle={hasMixedCurrencies ? "Mixed currencies" : "Purchase value"} icon={DollarSign} iconBgColor="bg-purple-500" iconColor="text-white" onClick={() => navigate("/assets/allassets")} animationDelay={d} />;
          case "fiscalPurchases":
            return <AssetStatCard key={widget.id} title="Fiscal Year" value={formatCurrency(fiscalYearValue)} subtitle={`${fiscalYearPurchases.length} purchased`} icon={ShoppingCart} iconBgColor="bg-orange-500" iconColor="text-white" onClick={() => navigate("/assets/allassets")} animationDelay={d} />;
          case "checkedOut":
            return <AssetStatCard key={widget.id} title="Checked Out" value={checkedOutCount} subtitle="Currently assigned" icon={Package} iconBgColor="bg-cyan-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?status=in_use")} animationDelay={d} />;
          case "underRepair":
            return <AssetStatCard key={widget.id} title="Under Repair" value={underRepairCount} subtitle={`${maintenanceDueCount} pending`} icon={Wrench} iconBgColor="bg-yellow-500" iconColor="text-white" onClick={() => navigate("/assets/advanced?tab=repairs")} animationDelay={d} />;
          case "disposed":
            return <AssetStatCard key={widget.id} title="Disposed" value={disposedCount} subtitle="Disposed assets" icon={Trash2} iconBgColor="bg-gray-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?status=disposed")} animationDelay={d} />;
          case "overdueAssets":
            return <AssetStatCard key={widget.id} title="Overdue" value={overdueAssignments.length} subtitle="Past return date" icon={Clock} iconBgColor="bg-red-500" iconColor="text-white" onClick={() => navigate("/assets/alerts?type=overdue")} animationDelay={d} />;
          case "warrantyExpiring":
            return <AssetStatCard key={widget.id} title="Warranty" value={expiringWarranties.length} subtitle="Expiring in 30d" icon={AlertTriangle} iconBgColor="bg-amber-500" iconColor="text-white" onClick={() => navigate("/assets/alerts?type=warranty")} animationDelay={d} />;
          case "leaseExpiring":
            return <AssetStatCard key={widget.id} title="Lease" value={expiringLeases.length} subtitle="Expiring in 30d" icon={Calendar} iconBgColor="bg-rose-500" iconColor="text-white" onClick={() => navigate("/assets/alerts?type=lease")} animationDelay={d} />;
          case "pendingConfirmation":
            return <AssetStatCard key={widget.id} title="Pending Confirm" value={pendingConfirmationCount} subtitle="Overdue for verification" icon={ShieldCheck} iconBgColor="bg-sky-500" iconColor="text-white" onClick={() => navigate("/assets/allassets?confirmation=overdue")} animationDelay={d} alert={pendingConfirmationCount > 0} />;
          case "deniedAssets":
            return <AssetStatCard key={widget.id} title="Denied" value={deniedCount} subtitle="Needs immediate action" icon={XCircle} iconBgColor="bg-red-600" iconColor="text-white" onClick={() => navigate("/assets/allassets?confirmation=denied")} animationDelay={d} alert={deniedCount > 0} />;
          default:
            return null;
        }
      })}
    </div>
  );
}