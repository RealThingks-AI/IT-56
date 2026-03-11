import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ALL_TOOL_QUERY_KEYS, parseImportDate } from "@/lib/subscriptions/subscriptionUtils";

export interface ValidatedSubRow {
  rowNum: number;
  raw: Record<string, string>;
  status: "new" | "update" | "error";
  error?: string;
}

const EXPORT_COLUMNS = [
  "No", "Asset Name", "Category", "Sub Type", "Quantity", "Seats / Licenses",
  "Unit Cost", "Currency", "Total Cost", "Vendor", "Department", "Purchase Date",
  "Renewal Date", "Next Payment Date", "Contract Start", "Contract End", "Status",
  "Notes", "Owner",
];

const normalize = (value: string) => value.trim().toLowerCase().replace(/[_\-\s]+/g, " ");

const col = (row: Record<string, string>, ...keys: string[]): string => {
  const entries = Object.entries(row).map(([key, value]) => [normalize(key), value] as const);
  for (const key of keys) {
    const found = entries.find(([entryKey]) => entryKey === normalize(key));
    if (found && found[1] !== undefined && found[1] !== "") return found[1];
  }
  return "";
};

const mapSubscriptionType = (raw: string): string => {
  const value = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    monthly: "monthly",
    quarterly: "quarterly",
    annual: "annual",
    yearly: "annual",
    owned: "owned",
    client: "client",
    "client managed": "client",
    "one time": "one_time",
    "one-time": "one_time",
  };
  return map[value] || "monthly";
};

const mapStatus = (raw: string): string => {
  const value = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    active: "active",
    expired: "expired",
    cancelled: "cancelled",
    trial: "trial",
    "expiring soon": "expiring_soon",
    expiring: "expiring_soon",
  };
  return map[value] || "active";
};

const detectCurrency = (raw: string): string => {
  if (!raw) return "INR";
  if (raw.includes("€") || raw.toLowerCase().includes("eur")) return "EUR";
  if (raw.includes("$") || raw.toLowerCase().includes("usd")) return "USD";
  if (raw.includes("£") || raw.toLowerCase().includes("gbp")) return "GBP";
  return "INR";
};

const parseNumber = (raw: string): number => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,\-]/g, "");
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (lastComma > lastDot) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma) normalized = cleaned.replace(/,/g, "");
  const value = parseFloat(normalized);
  return Number.isNaN(value) ? 0 : value;
};

export const parseFileToRows = async (file: File): Promise<Record<string, string>[]> => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
    throw new Error(`Unsupported file type: .${ext}`);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return rows.map((row) => {
    const out: Record<string, string> = {};
    Object.keys(row).forEach((key) => {
      out[key.trim()] = String(row[key] ?? "").trim();
    });
    return out;
  });
};

export const validateRows = async (rows: Record<string, string>[]): Promise<ValidatedSubRow[]> => {
  const { data: existing } = await supabase.from("subscriptions_tools").select("id, tool_name");
  const existingNames = new Set((existing || []).map((tool) => tool.tool_name.toLowerCase()));

  return rows.map((row, index) => {
    const name = col(row, "Asset Name", "tool_name", "name", "service name", "subscription name");
    if (!name) {
      return { rowNum: index + 2, raw: row, status: "error", error: "Missing Asset Name" };
    }
    return {
      rowNum: index + 2,
      raw: row,
      status: existingNames.has(name.toLowerCase()) ? "update" : "new",
    };
  });
};

export function useSubscriptionImportExport() {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const exportSubscriptions = async () => {
    setIsExporting(true);
    try {
      const { data: tools, error } = await supabase
        .from("subscriptions_tools")
        .select("*, subscriptions_vendors(name)")
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!tools?.length) {
        toast.warning("No subscriptions to export");
        return;
      }

      const rows = tools.map((tool, index) => ({
        "No": index + 1,
        "Asset Name": tool.tool_name,
        "Category": tool.category || "",
        "Sub Type": tool.subscription_type || "",
        "Quantity": tool.quantity || 1,
        "Seats / Licenses": tool.license_count ?? "",
        "Unit Cost": tool.unit_cost || 0,
        "Currency": tool.currency || "INR",
        "Total Cost": tool.total_cost || 0,
        "Vendor": (tool.subscriptions_vendors as { name?: string } | null)?.name || "",
        "Department": tool.department || "",
        "Purchase Date": (tool as any).purchase_date ? format(new Date((tool as any).purchase_date), "dd/MM/yyyy") : "",
        "Renewal Date": tool.renewal_date ? format(new Date(tool.renewal_date), "dd/MM/yyyy") : "",
        "Next Payment Date": tool.next_payment_date ? format(new Date(tool.next_payment_date), "dd/MM/yyyy") : "",
        "Contract Start": tool.contract_start_date ? format(new Date(tool.contract_start_date), "dd/MM/yyyy") : "",
        "Contract End": tool.contract_end_date ? format(new Date(tool.contract_end_date), "dd/MM/yyyy") : "",
        "Status": tool.status || "",
        "Notes": tool.notes || "",
        "Owner": tool.owner_name || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Subscriptions");
      worksheet["!cols"] = EXPORT_COLUMNS.map((column) => ({ wch: Math.max(column.length + 2, 14) }));
      XLSX.writeFile(workbook, `Subscriptions_Export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success(`Exported ${tools.length} subscriptions`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const importSubscriptions = async (rows: Record<string, string>[]) => {
    setIsImporting(true);
    const errors: { row: number; error: string }[] = [];
    setImportProgress({ current: 0, total: rows.length });

    try {
      const { data: vendors } = await supabase.from("subscriptions_vendors").select("id, name");
      const vendorMap = new Map((vendors || []).map((vendor) => [vendor.name.toLowerCase(), vendor.id]));

      const { data: existing } = await supabase.from("subscriptions_tools").select("id, tool_name");
      const existingMap = new Map((existing || []).map((tool) => [tool.tool_name.toLowerCase(), tool.id]));

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const name = col(row, "Asset Name", "tool_name", "name", "service name", "subscription name");

        if (!name) {
          errors.push({ row: index + 2, error: "Missing name" });
          continue;
        }

        const category = col(row, "Category", "category") || null;
        const subscriptionType = col(row, "Sub Type", "subscription type", "type", "sub type");
        const quantityRaw = col(row, "Quantity", "qty", "units");
        const seatsRaw = col(row, "Seats / Licenses", "license count", "licenses", "seats");
        const unitCostRaw = col(row, "Unit Cost", "unit cost", "cost", "price");
        const currencyRaw = col(row, "Currency", "currency") || unitCostRaw;
        const vendorName = col(row, "Vendor", "vendor name");
        const department = col(row, "Department", "department") || null;
        const renewalRaw = col(row, "Renewal Date", "renewal date");
        const nextPaymentRaw = col(row, "Next Payment Date", "next payment", "next payment date");
        const contractStartRaw = col(row, "Contract Start", "contract start", "contract start date");
        const contractEndRaw = col(row, "Contract End", "contract end", "contract end date");
        const statusRaw = col(row, "Status", "status");
        const purchaseDateRaw = col(row, "Purchase Date", "purchase date", "purchased on", "date of purchase");
        const notes = col(row, "Notes", "notes", "remarks") || null;
        const ownerName = col(row, "Owner", "owner name", "assigned owner") || null;

        const quantity = Math.max(1, parseInt(quantityRaw || "1", 10) || 1);
        const licenseCount = seatsRaw ? Math.max(0, parseInt(seatsRaw, 10) || 0) : null;
        const unitCost = parseNumber(unitCostRaw);
        const currency = detectCurrency(currencyRaw);

        let vendorId: string | null = null;
        if (vendorName) {
          vendorId = vendorMap.get(vendorName.toLowerCase()) || null;
          if (!vendorId) {
            const { data: newVendor } = await supabase
              .from("subscriptions_vendors")
              .insert({ name: vendorName })
              .select("id")
              .single();
            if (newVendor) {
              vendorId = newVendor.id;
              vendorMap.set(vendorName.toLowerCase(), newVendor.id);
            }
          }
        }

        const purchaseDate = parseImportDate(purchaseDateRaw);

        const payload = {
          tool_name: name,
          category,
          subscription_type: mapSubscriptionType(subscriptionType),
          quantity,
          license_count: licenseCount,
          unit_cost: unitCost,
          currency,
          total_cost: quantity * unitCost,
          vendor_id: vendorId,
          department,
          purchase_date: purchaseDate,
          renewal_date: parseImportDate(renewalRaw),
          next_payment_date: parseImportDate(nextPaymentRaw),
          contract_start_date: parseImportDate(contractStartRaw),
          contract_end_date: parseImportDate(contractEndRaw),
          status: mapStatus(statusRaw),
          notes,
          owner_name: ownerName,
        };

        const existingId = existingMap.get(name.toLowerCase());
        const { error } = existingId
          ? await supabase.from("subscriptions_tools").update(payload).eq("id", existingId)
          : await supabase.from("subscriptions_tools").insert(payload);

        if (error) errors.push({ row: index + 2, error: error.message });
        setImportProgress({ current: index + 1, total: rows.length });
      }

      ALL_TOOL_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [...key] }));

      if (errors.length === 0) toast.success(`Imported ${rows.length} subscriptions successfully`);
      else toast.warning(`Imported with ${errors.length} errors`);

      return errors;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Import failed");
      return errors;
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([{
      "No": 1,
      "Asset Name": "Example Software",
      "Category": "Software",
      "Sub Type": "Monthly",
      "Quantity": 5,
      "Seats / Licenses": 25,
      "Unit Cost": 1000,
      "Currency": "INR",
      "Total Cost": 5000,
      "Vendor": "",
      "Department": "IT",
      "Purchase Date": "",
      "Renewal Date": "",
      "Next Payment Date": "",
      "Contract Start": "",
      "Contract End": "",
      "Status": "Active",
      "Notes": "",
      "Owner": "",
    }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Subscription_Import_Template.xlsx");
  };

  return {
    isExporting,
    isImporting,
    importProgress,
    exportSubscriptions,
    importSubscriptions,
    downloadTemplate,
    parseFileToRows,
    validateRows,
  };
}
