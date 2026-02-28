import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";

interface LookupItem { id: string; name: string }
interface LocationLookup extends LookupItem { site?: { id: string; name: string } | null }

interface Lookups {
  categories: LookupItem[];
  makes: LookupItem[];
  locations: LocationLookup[];
  departments: LookupItem[];
  sites: LookupItem[];
  vendors: LookupItem[];
}

export interface ValidatedRow {
  rowNum: number;
  raw: Record<string, string>;
  status: "new" | "update" | "error";
  error?: string;
  mappedColumns: string[];
  unmappedColumns: string[];
}

/* ═══════════════════════════════════════════════════════════
   EXPORT FIELDS — broad, read-only report (18 fields, 3 groups)
   ═══════════════════════════════════════════════════════════ */
export const EXPORT_FIELD_GROUPS = {
  asset: {
    label: "Asset Fields",
    fields: [
      { key: "asset_tag", label: "Asset Tag ID", default: true },
      { key: "asset_id", label: "Asset ID", default: false },
      { key: "name", label: "Name", default: true },
      { key: "description", label: "Description", default: false },
      { key: "make", label: "Brand (Make)", default: true },
      { key: "model", label: "Model", default: true },
      { key: "serial_number", label: "Serial Number", default: true },
      { key: "purchase_price", label: "Cost", default: true },
      { key: "purchase_date", label: "Purchase Date", default: true },
      { key: "warranty_expiry", label: "Warranty Expiry", default: false },
    ],
  },
  linking: {
    label: "Linking Fields",
    fields: [
      { key: "category", label: "Category", default: true },
      { key: "department", label: "Department", default: true },
      { key: "location", label: "Location", default: true },
      { key: "site", label: "Site", default: false },
    ],
  },
  status: {
    label: "Status Fields",
    fields: [
      { key: "status", label: "Status", default: true },
      { key: "assigned_to", label: "Assigned To", default: false },
      { key: "vendor", label: "Vendor", default: false },
      { key: "created_by", label: "Created By", default: false },
      { key: "created_at", label: "Date Created", default: false },
      { key: "notes", label: "Notes", default: false },
      { key: "check_out_notes", label: "Checkout Notes", default: false },
    ],
  },
  events: {
    label: "Event Fields",
    fields: [
      { key: "checked_out_at", label: "Checked Out Date", default: false },
      { key: "expected_return_date", label: "Expected Return Date", default: false },
    ],
  },
  financial: {
    label: "Financial Fields",
    fields: [
      { key: "salvage_value", label: "Salvage Value", default: false },
      { key: "useful_life_years", label: "Useful Life (Years)", default: false },
      { key: "depreciation_method", label: "Depreciation Method", default: false },
    ],
  },
} as const;

/* ═══════════════════════════════════════════════════════════
   IMPORT FIELDS — writable, focused (16 fields, 3 groups)
   ═══════════════════════════════════════════════════════════ */
export const IMPORT_FIELD_GROUPS = {
  asset: {
    label: "Asset Fields",
    fields: [
      { key: "asset_tag", label: "Asset Tag ID", required: true },
      { key: "name", label: "Name", required: false },
      { key: "description", label: "Description", required: false },
      { key: "make", label: "Brand (Make)", required: false, autoCreate: true },
      { key: "model", label: "Model", required: false },
      { key: "serial_number", label: "Serial Number", required: false },
      { key: "purchase_price", label: "Cost", required: false },
      { key: "purchase_date", label: "Purchase Date", required: false },
      { key: "warranty_expiry", label: "Warranty Expiry", required: false },
      { key: "notes", label: "Notes", required: false },
    ],
  },
  linking: {
    label: "Linking Fields",
    fields: [
      { key: "category", label: "Category", required: false, autoCreate: true },
      { key: "department", label: "Department", required: false, autoCreate: true },
      { key: "location", label: "Location", required: false, autoCreate: true },
      { key: "site", label: "Site", required: false, autoCreate: true },
      { key: "vendor", label: "Vendor", required: false, autoCreate: true },
    ],
  },
  status: {
    label: "Status",
    fields: [
      { key: "status", label: "Status", required: false },
    ],
  },
} as const;

export const getAllFieldKeys = (): string[] => {
  const keys: string[] = [];
  Object.values(EXPORT_FIELD_GROUPS).forEach((g) => g.fields.forEach((f) => keys.push(f.key)));
  return keys;
};

export const getDefaultSelectedFields = (): string[] => {
  const selected: string[] = [];
  Object.values(EXPORT_FIELD_GROUPS).forEach((g) => g.fields.forEach((f) => { if (f.default) selected.push(f.key); }));
  return selected;
};

/** All known import column labels for matching headers */
const IMPORT_KNOWN_HEADERS: string[] = [];
Object.values(IMPORT_FIELD_GROUPS).forEach((g) => g.fields.forEach((f) => IMPORT_KNOWN_HEADERS.push(f.label)));

const normalize = (s: string): string =>
  s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\-\s]+/g, " ");

/** Case-insensitive, accent-normalized column lookup */
const col = (row: Record<string, string>, ...keys: string[]): string => {
  const normalizedEntries = Object.entries(row).map(([k, v]) => [normalize(k), v] as const);
  for (const k of keys) {
    const nk = normalize(k);
    const found = normalizedEntries.find(([ek]) => ek === nk);
    if (found && found[1] !== undefined && found[1] !== "") return found[1];
  }
  return "";
};

const fmtStatus = (status: string | null): string => {
  if (!status) return "";
  return status.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
};

const fmtCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

const fmtDate = (value: string | null): string => {
  if (!value) return "";
  try { return format(new Date(value), "dd MMM yyyy"); } catch { return value; }
};

/** Locale-aware number parsing: handles 1,234.56 (US) and 1.234,56 (EU) */
const parseNumericValue = (raw: string): number | null => {
  if (!raw) return null;
  let cleaned = raw.replace(/[^\d.,\-]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma > lastDot) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (lastComma >= 0 && lastDot < 0) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }

  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
};

/** Auto-detect CSV delimiter by counting occurrences in first lines */
const detectDelimiter = (text: string): string => {
  const lines = text.split("\n").slice(0, 5).filter((l) => l.trim());
  if (lines.length === 0) return ",";

  const delimiters = [",", ";", "\t"];
  const scores = delimiters.map((d) => {
    const counts = lines.map((l) => l.split(d).length - 1);
    const consistent = counts.every((c) => c === counts[0] && c > 0);
    return { d, score: consistent ? counts[0] : 0 };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].d : ",";
};

const parseCSVLine = (line: string, delimiter: string = ","): string[] => {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
};

const parseFlexDate = (raw: string): string | null => {
  if (!raw) return null;
  const s = raw.trim();

  // Excel serial number
  if (/^\d+$/.test(s)) {
    const num = parseInt(s, 10);
    if (num >= 1 && num <= 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(date.getTime())) return format(date, "yyyy-MM-dd");
    }
  }

  // ISO: yyyy-MM-dd
  const iso = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso.map(Number);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // DD/MM/YYYY
  const dmy4 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy4) {
    const [, a, b, year] = dmy4.map(Number);
    if (a > 12 && b >= 1 && b <= 12) return `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    if (b > 12 && a >= 1 && a <= 12) return `${year}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    if (b >= 1 && b <= 12 && a >= 1 && a <= 31)
      return `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }

  // DD/MM/YY
  const dmy2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmy2) {
    const [, a, b, yy] = dmy2.map(Number);
    const year = yy < 50 ? 2000 + yy : 1900 + yy;
    if (a > 12 && b >= 1 && b <= 12) return `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    if (b > 12 && a >= 1 && a <= 12) return `${year}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    if (b >= 1 && b <= 12 && a >= 1 && a <= 31)
      return `${year}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }

  try {
    const date = new Date(s);
    if (!isNaN(date.getTime())) return format(date, "yyyy-MM-dd");
  } catch {}

  return null;
};

const mapStatus = (raw: string): string => {
  const s = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    available: "available", "checked out": "in_use", "check out": "in_use",
    checked_out: "in_use", "in use": "in_use", in_use: "in_use",
    disposed: "disposed", dispose: "disposed",
    "under repair": "maintenance", maintenance: "maintenance", repair: "maintenance",
    retired: "retired", lost: "lost", broken: "maintenance", stolen: "lost", reserved: "available",
  };
  return map[s] || "available";
};

/** Import template headers — only importable fields */
const getImportTemplateHeaders = (): string[] => {
  const h: string[] = [];
  Object.values(IMPORT_FIELD_GROUPS).forEach((g) => g.fields.forEach((f) => h.push(f.label)));
  return h;
};

const VALID_EXTENSIONS = ["xlsx", "xls", "csv"];

export const parseFileToRows = async (file: File): Promise<Record<string, string>[]> => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !VALID_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type: .${ext}. Use .xlsx, .xls, or .csv`);
  }

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return rows.map((row) => {
      const out: Record<string, string> = {};
      Object.keys(row).forEach((key) => { out[key.trim()] = String(row[key] ?? "").trim(); });
      return out;
    });
  }

  const text = await file.text();
  const delimiter = detectDelimiter(text);
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || "").trim(); });
    return row;
  });
};

/** Classify import columns as mapped or unmapped (uses IMPORT fields only) */
export const classifyColumns = (headers: string[]): { mapped: string[]; unmapped: string[] } => {
  const importKeywords = [
    "asset tag", "asset_tag", "name", "description", "make", "brand", "model",
    "serial number", "serial no", "serial_number", "cost", "purchase_price", "purchase price",
    "warranty expiry", "warranty_expiry", "notes", "category", "department", "location",
    "site", "status", "vendor", "purchased from",
  ];
  const mapped: string[] = [];
  const unmapped: string[] = [];
  for (const h of headers) {
    const nh = normalize(h);
    const isKnown = IMPORT_KNOWN_HEADERS.some((kh) => normalize(kh) === nh)
      || importKeywords.some((k) => nh.includes(k));
    if (isKnown) mapped.push(h);
    else unmapped.push(h);
  }
  return { mapped, unmapped };
};

/** Pre-validate rows for preview: classify as new/update/error without writing */
export const validateRowsForPreview = async (
  rows: Record<string, string>[]
): Promise<ValidatedRow[]> => {
  const { data: existingAssets } = await supabase.from("itam_assets").select("id, asset_tag").eq("is_active", true);
  const existingSet = new Set<string>();
  (existingAssets || []).forEach((a: any) => { if (a.asset_tag) existingSet.add(a.asset_tag); });

  const allHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
  const { mapped, unmapped } = classifyColumns(allHeaders);

  return rows.map((row, i) => {
    const assetTag = col(row, "Asset Tag ID", "asset_tag", "Asset Tag");
    if (!assetTag) {
      return { rowNum: i + 2, raw: row, status: "error" as const, error: "Missing Asset Tag ID", mappedColumns: mapped, unmappedColumns: unmapped };
    }
    const status = existingSet.has(assetTag) ? "update" as const : "new" as const;
    return { rowNum: i + 2, raw: row, status, mappedColumns: mapped, unmappedColumns: unmapped };
  });
};

export type ExportFormat = "csv" | "xlsx";

export type ImportPhase = "idle" | "validating" | "writing" | "done";

export function useAssetExportImport() {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importPhase, setImportPhase] = useState<ImportPhase>("idle");
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);

  const resetImportState = () => {
    setImportErrors([]);
    setImportProgress({ current: 0, total: 0 });
    setImportPhase("idle");
  };

  const fetchLookups = async (): Promise<Lookups> => {
    const [categories, makes, locations, departments, sites, vendors] = await Promise.all([
      supabase.from("itam_categories").select("id, name"),
      supabase.from("itam_makes").select("id, name"),
      supabase.from("itam_locations").select("id, name, site:itam_sites(id, name)"),
      supabase.from("itam_departments").select("id, name"),
      supabase.from("itam_sites").select("id, name"),
      supabase.from("itam_vendors").select("id, name"),
    ]);
    return {
      categories: categories.data || [],
      makes: makes.data || [],
      locations: (locations.data as LocationLookup[]) || [],
      departments: departments.data || [],
      sites: sites.data || [],
      vendors: vendors.data || [],
    };
  };

  const findOrCreate = async (lookups: LookupItem[], name: string, table: string): Promise<string | null> => {
    if (!name) return null;
    const existing = lookups.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const { data, error } = await supabase.from(table as any).insert({ name } as any).select("id").single();
    if (error || !data) return null;
    lookups.push({ id: (data as any).id, name });
    return (data as any).id;
  };

  const findOrCreateLocation = async (lookups: Lookups, locationName: string, siteId: string | null): Promise<string | null> => {
    if (!locationName) return null;
    const existing = lookups.locations.find((l) => l.name.toLowerCase() === locationName.toLowerCase());
    if (existing) return existing.id;
    const payload: any = { name: locationName };
    if (siteId) payload.site_id = siteId;
    const { data, error } = await supabase.from("itam_locations").insert(payload).select("id").single();
    if (error || !data) return null;
    lookups.locations.push({ id: data.id, name: locationName });
    return data.id;
  };

  /* ═══════ EXPORT ═══════ */
  const exportAssets = async (selectedFields: string[], exportFormat: ExportFormat = "csv") => {
    setIsExporting(true);
    try {
      const { data: assets, error } = await supabase
        .from("itam_assets")
        .select(`*, category:itam_categories(id, name), location:itam_locations(id, name, site:itam_sites(id, name)), department:itam_departments(id, name), make:itam_makes(id, name), vendor:itam_vendors(id, name)`)
        .order("created_at", { ascending: false })
        .limit(10000);

      if (error) throw error;
      if (!assets?.length) { toast.error("No assets to export"); return 0; }

      const { data: allUsers } = await supabase.from("users").select("id, name, email");
      const userMap = new Map<string, string>();
      (allUsers || []).forEach((u: any) => userMap.set(u.id, u.name || u.email || u.id));

      const exportData = assets.map((asset: any) => {
        const row: Record<string, string> = {};
        const has = (key: string) => selectedFields.includes(key);
        if (has("asset_tag")) row["Asset Tag ID"] = asset.asset_tag || "";
        if (has("asset_id")) row["Asset ID"] = asset.asset_id || "";
        if (has("name")) row["Name"] = asset.name || "";
        if (has("description")) row["Description"] = asset.description || "";
        if (has("make")) row["Brand (Make)"] = asset.make?.name || "";
        if (has("model")) row["Model"] = asset.model || "";
        if (has("serial_number")) row["Serial Number"] = asset.serial_number || "";
        if (has("purchase_price")) row["Cost"] = fmtCurrency(asset.purchase_price);
        if (has("purchase_date")) row["Purchase Date"] = fmtDate(asset.purchase_date);
        if (has("warranty_expiry")) row["Warranty Expiry"] = fmtDate(asset.warranty_expiry);
        if (has("category")) row["Category"] = asset.category?.name || "";
        if (has("department")) row["Department"] = asset.department?.name || "";
        if (has("location")) row["Location"] = asset.location?.name || "";
        if (has("site")) row["Site"] = asset.location?.site?.name || "";
        if (has("status")) row["Status"] = fmtStatus(asset.status);
        if (has("assigned_to")) {
          const userId = asset.checked_out_to || asset.assigned_to;
          row["Assigned To"] = userId ? userMap.get(userId) || "" : "";
        }
        if (has("vendor")) row["Vendor"] = asset.vendor?.name || "";
        if (has("created_by")) row["Created By"] = asset.created_by ? userMap.get(asset.created_by) || "" : "";
        if (has("created_at")) row["Date Created"] = fmtDate(asset.created_at);
        if (has("notes")) row["Notes"] = asset.notes || "";
        if (has("check_out_notes")) row["Checkout Notes"] = asset.check_out_notes || "";
        if (has("checked_out_at")) row["Checked Out Date"] = fmtDate(asset.checked_out_at);
        if (has("expected_return_date")) row["Expected Return Date"] = fmtDate(asset.expected_return_date);
        if (has("salvage_value")) row["Salvage Value"] = fmtCurrency(asset.salvage_value);
        if (has("useful_life_years")) row["Useful Life (Years)"] = asset.useful_life_years != null ? String(asset.useful_life_years) : "";
        if (has("depreciation_method")) row["Depreciation Method"] = fmtStatus(asset.depreciation_method);
        return row;
      });

      const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");

      if (exportFormat === "xlsx") {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Assets");
        XLSX.writeFile(wb, `assets-export-${timestamp}.xlsx`);
      } else {
        const headers = Object.keys(exportData[0] || {});
        const csvRows = [headers.join(",")];
        exportData.forEach((row) => {
          const values = headers.map((header) => {
            const value = String(row[header] || "").replace(/"/g, '""');
            return value.includes(",") || value.includes("\n") || value.includes('"') ? `"${value}"` : value;
          });
          csvRows.push(values.join(","));
        });
        const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `assets-export-${timestamp}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${assets.length} assets as ${exportFormat.toUpperCase()}`);
      return assets.length;
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export assets");
      return 0;
    } finally {
      setIsExporting(false);
    }
  };

  /* ═══════ IMPORT ═══════ */
  const importAssets = async (file: File) => {
    setIsImporting(true);
    setImportErrors([]);
    setImportProgress({ current: 0, total: 0 });
    setImportPhase("validating");

    try {
      const [lookups, rows] = await Promise.all([fetchLookups(), parseFileToRows(file)]);

      if (!rows.length) {
        toast.error("File is empty or has no data rows");
        return { success: 0, errors: [] };
      }

      setImportProgress({ current: 0, total: rows.length });

      const errors: { row: number; error: string }[] = [];
      let successCount = 0;

      const { data: existingAssets } = await supabase.from("itam_assets").select("id, asset_tag").eq("is_active", true);
      const existingMap = new Map<string, string>();
      (existingAssets || []).forEach((asset: any) => { if (asset.asset_tag) existingMap.set(asset.asset_tag, asset.id); });

      const insertBatch: Array<{ row: number; data: any }> = [];
      const updateBatch: Array<{ row: number; id: string; data: any }> = [];

      // Phase 1: Validate & resolve lookups
      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        try {
          const row = rows[i];
          const assetTag = col(row, "Asset Tag ID", "asset_tag", "Asset Tag");
          if (!assetTag) {
            errors.push({ row: rowNum, error: "Asset Tag ID is required" });
            setImportProgress({ current: i + 1, total: rows.length });
            continue;
          }

          const categoryId = await findOrCreate(lookups.categories, col(row, "Category", "category"), "itam_categories");
          const makeId = await findOrCreate(lookups.makes, col(row, "Brand (Make)", "Brand", "make"), "itam_makes");
          const siteId = await findOrCreate(lookups.sites, col(row, "Site", "site"), "itam_sites");
          const locationId = await findOrCreateLocation(lookups, col(row, "Location", "location"), siteId);
          const departmentId = await findOrCreate(lookups.departments, col(row, "Department", "department"), "itam_departments");
          const vendorId = await findOrCreate(lookups.vendors, col(row, "Vendor", "Purchased From (Vendor)", "Purchased from", "vendor"), "itam_vendors");

          const statusRaw = col(row, "Status", "status");
          const status = statusRaw ? mapStatus(statusRaw) : "available";

          const purchasePrice = parseNumericValue(col(row, "Cost", "purchase_price"));
          const purchaseDate = parseFlexDate(col(row, "Purchase Date", "purchase_date"));
          const warrantyExpiry = parseFlexDate(col(row, "Warranty Expiry", "warranty_expiry"));

          const name = col(row, "Name", "name") || col(row, "Description", "description") || assetTag;
          const description = col(row, "Description", "description");
          const model = col(row, "Model", "model");
          const serialNumber = col(row, "Serial Number", "Serial No", "serial_number");
          const notes = col(row, "Notes", "notes");

          const assetData: any = {
            asset_tag: assetTag,
            asset_id: assetTag, // asset_id = asset_tag (NOT NULL field)
            name,
            description: description || null,
            model: model || null,
            serial_number: serialNumber || null,
            status,
            purchase_price: purchasePrice,
            purchase_date: purchaseDate,
            warranty_expiry: warrantyExpiry,
            notes: notes || null,
          };

          if (categoryId) assetData.category_id = categoryId;
          if (makeId) assetData.make_id = makeId;
          if (locationId) assetData.location_id = locationId;
          if (departmentId) assetData.department_id = departmentId;
          if (vendorId) assetData.vendor_id = vendorId;

          const existingId = existingMap.get(assetTag);
          if (existingId) {
            updateBatch.push({ row: rowNum, id: existingId, data: assetData });
          } else {
            insertBatch.push({ row: rowNum, data: assetData });
          }
        } catch (rowError: any) {
          errors.push({ row: rowNum, error: rowError.message || "Unknown error" });
        }
        setImportProgress({ current: i + 1, total: rows.length });
      }

      // Phase 2: Write to database
      setImportPhase("writing");
      const totalWrites = insertBatch.length + updateBatch.length;
      let writesCompleted = 0;
      setImportProgress({ current: 0, total: totalWrites });

      // Batch inserts
      for (let i = 0; i < insertBatch.length; i += 50) {
        const chunk = insertBatch.slice(i, i + 50);
        const { error: batchError, data: inserted } = await supabase
          .from("itam_assets")
          .insert(chunk.map((c) => c.data))
          .select("id");

        if (batchError) {
          for (const item of chunk) {
            const { error: singleError } = await supabase.from("itam_assets").insert(item.data);
            if (singleError) errors.push({ row: item.row, error: singleError.message });
            else successCount += 1;
          }
        } else {
          successCount += inserted?.length || chunk.length;
        }
        writesCompleted += chunk.length;
        setImportProgress({ current: writesCompleted, total: totalWrites });
      }

      // Batch updates (chunks of 50)
      for (let i = 0; i < updateBatch.length; i += 50) {
        const chunk = updateBatch.slice(i, i + 50);
        const results = await Promise.all(
          chunk.map((item) => supabase.from("itam_assets").update(item.data).eq("id", item.id))
        );
        results.forEach((res, idx) => {
          if (res.error) errors.push({ row: chunk[idx].row, error: res.error.message });
          else successCount += 1;
        });
        writesCompleted += chunk.length;
        setImportProgress({ current: writesCompleted, total: totalWrites });
      }

      setImportPhase("done");
      setImportErrors(errors);

      if (successCount > 0) {
        invalidateAllAssetQueries(queryClient);
        toast.success(`Imported ${successCount} assets successfully`);
      }
      if (errors.length > 0) toast.warning(`${errors.length} rows had errors`);

      return { success: successCount, errors };
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Failed to import assets: " + error.message);
      return { success: 0, errors: [] };
    } finally {
      setIsImporting(false);
    }
  };

  /* ═══════ TEMPLATE ═══════ */
  const downloadTemplate = (formatType: ExportFormat = "csv") => {
    const headers = getImportTemplateHeaders();
    const exampleRow: Record<string, string> = {
      "Asset Tag ID": "AST-0001",
      "Name": "Dell Latitude 5520",
      "Description": "Standard office laptop",
      "Brand (Make)": "Dell",
      "Model": "Latitude 5520",
      "Serial Number": "ABC123456",
      "Cost": "75000",
      "Purchase Date": "2024-01-15",
      "Warranty Expiry": "2027-01-15",
      "Notes": "",
      "Category": "Laptop",
      "Department": "IT Department",
      "Location": "Head Office",
      "Site": "Mumbai",
      "Vendor": "Dell India",
      "Status": "Available",
    };

    if (formatType === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Import Template");
      XLSX.writeFile(workbook, "asset-import-template.xlsx");
    } else {
      const csvRows = [
        headers.join(","),
        headers.map((h) => {
          const v = exampleRow[h] || "";
          return v.includes(",") ? `"${v}"` : v;
        }).join(","),
      ];
      const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "asset-import-template.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    }
    toast.success("Template downloaded");
  };

  return {
    exportAssets, importAssets, downloadTemplate, resetImportState,
    isExporting, isImporting, importProgress, importPhase, importErrors,
  };
}
