import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";

// Types for lookup tables
interface LookupItem {
  id: string;
  name: string;
}

interface UserLookup {
  id: string;
  name: string | null;
  email: string | null;
}

interface LocationLookup extends LookupItem {
  site?: { id: string; name: string } | null;
}

interface Lookups {
  categories: LookupItem[];
  makes: LookupItem[];
  locations: LocationLookup[];
  departments: LookupItem[];
  sites: LookupItem[];
  vendors: LookupItem[];
  users: UserLookup[];
}

// Field configuration for export
export const EXPORT_FIELD_GROUPS = {
  asset: {
    label: "Asset Fields",
    fields: [
      { key: "asset_tag", label: "Asset Tag ID", default: true },
      { key: "name", label: "Name", default: true },
      { key: "description", label: "Description", default: false },
      { key: "make", label: "Brand (Make)", default: true },
      { key: "model", label: "Model", default: true },
      { key: "serial_number", label: "Serial Number", default: true },
      { key: "purchase_price", label: "Cost", default: true },
      { key: "purchase_date", label: "Purchase Date", default: true },
      { key: "vendor", label: "Purchased From (Vendor)", default: false },
      { key: "warranty_expiry", label: "Warranty Expiry", default: false },
      { key: "notes", label: "Notes", default: false },
      { key: "created_at", label: "Date Created", default: false },
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
  event: {
    label: "Event Fields",
    fields: [
      { key: "status", label: "Status", default: true },
      { key: "assigned_to", label: "Assigned To", default: false },
      { key: "checked_out_to", label: "Checked Out To", default: false },
      { key: "checked_out_at", label: "Check Out Date", default: false },
      { key: "expected_return_date", label: "Expected Return", default: false },
    ],
  },
  depreciation: {
    label: "Depreciation Fields",
    fields: [
      { key: "useful_life_years", label: "Useful Life (Years)", default: false },
      { key: "salvage_value", label: "Salvage Value", default: false },
      { key: "depreciation_method", label: "Depreciation Method", default: false },
    ],
  },
  custom: {
    label: "Custom Fields",
    fields: [
      { key: "asset_configuration", label: "Configuration", default: false },
      { key: "classification", label: "Classification", default: false },
      { key: "photo_url", label: "Photo URL", default: false },
      { key: "assigned_to_name", label: "Assigned To (Name)", default: false },
      { key: "created_by_name", label: "Created By", default: false },
      { key: "leased_to", label: "Leased To", default: false },
      { key: "relation", label: "Relation", default: false },
      { key: "transact_as_whole", label: "Transact as a Whole", default: false },
      { key: "event_date", label: "Event Date", default: false },
      { key: "event_due_date", label: "Event Due Date", default: false },
      { key: "headphone", label: "Headphone", default: false },
      { key: "mouse", label: "Mouse", default: false },
      { key: "keyboard", label: "Keyboard", default: false },
    ],
  },
};

// Get all available field keys
export const getAllFieldKeys = () => {
  const keys: string[] = [];
  Object.values(EXPORT_FIELD_GROUPS).forEach((group) => {
    group.fields.forEach((field) => keys.push(field.key));
  });
  return keys;
};

// Get default selected fields
export const getDefaultSelectedFields = () => {
  const selected: string[] = [];
  Object.values(EXPORT_FIELD_GROUPS).forEach((group) => {
    group.fields.forEach((field) => {
      if (field.default) selected.push(field.key);
    });
  });
  return selected;
};

// Format helpers
const formatStatus = (status: string | null): string => {
  if (!status) return "";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return "";
  // Use plain number format for exports (locale-neutral, no currency symbol)
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: string | null): string => {
  if (!date) return "";
  try {
    return format(new Date(date), "dd MMM yyyy");
  } catch {
    return date;
  }
};

// Parse CSV helper that handles quoted fields
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// ── Date parsing that handles DD/MM/YYYY, Excel serial numbers, 2-digit years, and ISO ──
const parseFlexibleDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const s = dateStr.trim();

  // Excel serial number detection (e.g., 44820 = 2022-09-16)
  if (/^\d+$/.test(s)) {
    const num = parseInt(s, 10);
    if (num >= 1 && num <= 60000) {
      // Excel epoch: 1900-01-01, but Excel incorrectly treats 1900 as leap year
      const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
      const date = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(date.getTime())) {
        return format(date, "yyyy-MM-dd");
      }
    }
  }

  // DD/MM/YYYY or MM/DD/YYYY with 4-digit year
  const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  // M/D/YY or D/M/YY with 2-digit year
  const twoDigitYear = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?:\s|$)/);
  if (twoDigitYear) {
    const first = parseInt(twoDigitYear[1], 10);
    const second = parseInt(twoDigitYear[2], 10);
    let yearShort = parseInt(twoDigitYear[3], 10);
    const year = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort;
    // Assume M/D/YY format (US style from AssetTiger)
    if (first >= 1 && first <= 12 && second >= 1 && second <= 31) {
      const mm = String(first).padStart(2, "0");
      const dd = String(second).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  // Fallback: let JS parse it (handles ISO, US formats, etc.)
  try {
    const date = new Date(s);
    if (!isNaN(date.getTime())) {
      return format(date, "yyyy-MM-dd");
    }
  } catch {
    // ignore
  }
  return null;
};

// ── Find user by name (case-insensitive, partial matching) ──
const findUserByName = (users: UserLookup[], name: string): string | null => {
  if (!name) return null;
  const lower = name.trim().toLowerCase();

  // Exact name match
  const exact = users.find((u) => u.name?.toLowerCase() === lower);
  if (exact) return exact.id;

  // Exact email match
  const emailMatch = users.find((u) => u.email?.toLowerCase() === lower);
  if (emailMatch) return emailMatch.id;

  // Partial match: check if user name contains the search or vice versa
  const partial = users.find((u) => {
    if (!u.name) return false;
    const uName = u.name.toLowerCase();
    return uName.includes(lower) || lower.includes(uName);
  });
  if (partial) return partial.id;

  return null;
};

// ── Status mapping from AssetTiger values to DB enum ──
const mapStatus = (raw: string): string => {
  const s = raw.trim().toLowerCase();
  const mapping: Record<string, string> = {
    "available": "available",
    "checked out": "in_use",
    "check out": "in_use",
    "checked_out": "in_use",
    "in use": "in_use",
    "in_use": "in_use",
    "disposed": "disposed",
    "dispose": "disposed",
    "under repair": "maintenance",
    "maintenance": "maintenance",
    "repair": "maintenance",
    "retired": "retired",
    "lost": "lost",
    "broken": "maintenance",
    "stolen": "lost",
    "reserved": "available",
  };
  return mapping[s] || "available";
};

// ── Cost parsing that strips currency symbols & commas ──
const parseCost = (raw: string): number | null => {
  if (!raw) return null;
  // Remove everything except digits, dots, and minus
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
};

// ── Parse file into row objects (supports XLSX and CSV) ──
const parseFileToRows = async (file: File): Promise<Record<string, string>[]> => {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // Get rows as array of objects with string values
    const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    // Coerce every value to string
    return jsonRows.map((row) => {
      const out: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        out[key.trim()] = String(row[key] ?? "").trim();
      }
      return out;
    });
  }

  // CSV fallback
  const text = await file.text();
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    return row;
  });
};

// ── Column alias helper: try multiple header names ──
const col = (row: Record<string, string>, ...keys: string[]): string => {
  for (const k of keys) {
    const val = row[k];
    if (val !== undefined && val !== "") return val;
  }
  return "";
};

export function useAssetExportImport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);

  // Fetch all lookup tables
  const fetchLookups = async (): Promise<Lookups> => {
    const [categories, makes, locations, departments, sites, vendors, usersResult] = await Promise.all([
      supabase.from("itam_categories").select("id, name"),
      supabase.from("itam_makes").select("id, name"),
      supabase.from("itam_locations").select("id, name, site:itam_sites(id, name)"),
      supabase.from("itam_departments").select("id, name"),
      supabase.from("itam_sites").select("id, name"),
      supabase.from("itam_vendors").select("id, name"),
      supabase.from("users").select("id, name, email"),
    ]);

    return {
      categories: categories.data || [],
      makes: makes.data || [],
      locations: (locations.data as LocationLookup[]) || [],
      departments: departments.data || [],
      sites: sites.data || [],
      vendors: vendors.data || [],
      users: (usersResult.data as UserLookup[]) || [],
    };
  };

  // ── Auto-create lookup helpers ──
  const findOrCreate = async (
    lookups: LookupItem[],
    name: string,
    table: string
  ): Promise<string | null> => {
    if (!name) return null;
    const existing = lookups.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;

    // Auto-create
    const { data, error } = await supabase
      .from(table as any)
      .insert({ name } as any)
      .select("id")
      .single();

    if (error || !data) {
      console.warn(`Failed to auto-create ${table} "${name}":`, error?.message);
      return null;
    }
    // Cache it so subsequent rows don't re-create
    lookups.push({ id: (data as any).id, name });
    return (data as any).id;
  };

  const findOrCreateSite = async (lookups: Lookups, siteName: string): Promise<string | null> => {
    return findOrCreate(lookups.sites, siteName, "itam_sites");
  };

  const findOrCreateLocation = async (
    lookups: Lookups,
    locationName: string,
    siteId: string | null
  ): Promise<string | null> => {
    if (!locationName) return null;
    const existing = lookups.locations.find(
      (l) => l.name.toLowerCase() === locationName.toLowerCase()
    );
    if (existing) return existing.id;

    const insertData: any = { name: locationName };
    if (siteId) insertData.site_id = siteId;

    const { data, error } = await supabase
      .from("itam_locations")
      .insert(insertData)
      .select("id")
      .single();

    if (error || !data) {
      console.warn(`Failed to auto-create location "${locationName}":`, error?.message);
      return null;
    }
    lookups.locations.push({ id: data.id, name: locationName });
    return data.id;
  };

  // Export assets with proper field mapping
  const exportAssets = async (selectedFields: string[]) => {
    setIsExporting(true);
    try {
      const { data: assets, error } = await supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          location:itam_locations(id, name, site:itam_sites(id, name)),
          department:itam_departments(id, name),
          make:itam_makes(id, name),
          vendor:itam_vendors(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(10000);

      if (error) throw error;
      if (!assets || assets.length === 0) {
        toast.error("No assets to export");
        return;
      }

      // Pre-fetch users for resolving assigned_to UUIDs to names
      const { data: allUsers } = await supabase.from("users").select("id, name, email");
      const userMap = new Map<string, string>();
      (allUsers || []).forEach((u: any) => {
        userMap.set(u.id, u.name || u.email || u.id);
      });

      const exportData = assets.map((asset: any) => {
        const customFields =
          typeof asset.custom_fields === "object" && asset.custom_fields !== null
            ? asset.custom_fields
            : {};

        const row: Record<string, string> = {};

        if (selectedFields.includes("asset_tag")) row["Asset Tag ID"] = asset.asset_tag || "";
        if (selectedFields.includes("name")) row["Name"] = asset.name || "";
        if (selectedFields.includes("description")) row["Description"] = asset.description || "";
        if (selectedFields.includes("make")) row["Brand (Make)"] = asset.make?.name || "";
        if (selectedFields.includes("model")) row["Model"] = asset.model || "";
        if (selectedFields.includes("serial_number")) row["Serial Number"] = asset.serial_number || "";
        if (selectedFields.includes("purchase_price")) row["Cost"] = formatCurrency(asset.purchase_price);
        if (selectedFields.includes("purchase_date")) row["Purchase Date"] = formatDate(asset.purchase_date);
        if (selectedFields.includes("vendor")) row["Purchased From (Vendor)"] = asset.vendor?.name || "";
        if (selectedFields.includes("warranty_expiry")) row["Warranty Expiry"] = formatDate(asset.warranty_expiry);
        if (selectedFields.includes("notes")) row["Notes"] = asset.notes || "";
        if (selectedFields.includes("created_at")) row["Date Created"] = formatDate(asset.created_at);
        if (selectedFields.includes("category")) row["Category"] = asset.category?.name || "";
        if (selectedFields.includes("department")) row["Department"] = asset.department?.name || "";
        if (selectedFields.includes("location")) row["Location"] = asset.location?.name || "";
        if (selectedFields.includes("site")) row["Site"] = asset.location?.site?.name || "";
        if (selectedFields.includes("status")) row["Status"] = formatStatus(asset.status);
        if (selectedFields.includes("assigned_to")) {
          const assignedUser = asset.assigned_to ? userMap.get(asset.assigned_to) : "";
          row["Assigned To"] = assignedUser || customFields.assigned_to_name || "";
        }
        if (selectedFields.includes("checked_out_to")) {
          const checkedOutUser = asset.checked_out_to ? userMap.get(asset.checked_out_to) : "";
          row["Checked Out To"] = checkedOutUser || "";
        }
        if (selectedFields.includes("checked_out_at")) row["Check Out Date"] = formatDate(asset.checked_out_at);
        if (selectedFields.includes("expected_return_date")) row["Expected Return"] = formatDate(asset.expected_return_date);
        if (selectedFields.includes("useful_life_years")) row["Useful Life (Years)"] = asset.useful_life_years?.toString() || "";
        if (selectedFields.includes("salvage_value")) row["Salvage Value"] = formatCurrency(asset.salvage_value);
        if (selectedFields.includes("depreciation_method")) row["Depreciation Method"] = formatStatus(asset.depreciation_method);
        if (selectedFields.includes("asset_configuration")) row["Configuration"] = customFields.asset_configuration || "";
        if (selectedFields.includes("classification")) {
          const cv = customFields.classification;
          row["Classification"] = Array.isArray(cv) ? cv.join(", ") : cv || "";
        }
        if (selectedFields.includes("photo_url")) row["Photo URL"] = customFields.photo_url || "";
        if (selectedFields.includes("assigned_to_name")) row["Assigned To (Name)"] = customFields.assigned_to_name || "";
        if (selectedFields.includes("created_by_name")) row["Created By"] = customFields.created_by || "";
        if (selectedFields.includes("leased_to")) row["Leased To"] = customFields.leased_to || "";
        if (selectedFields.includes("relation")) row["Relation"] = customFields.relation || "";
        if (selectedFields.includes("transact_as_whole")) row["Transact as a Whole"] = customFields.transact_as_whole || "";
        if (selectedFields.includes("event_date")) row["Event Date"] = customFields.event_date || "";
        if (selectedFields.includes("event_due_date")) row["Event Due Date"] = customFields.event_due_date || "";
        if (selectedFields.includes("headphone")) row["Headphone"] = customFields.headphone || "";
        if (selectedFields.includes("mouse")) row["Mouse"] = customFields.mouse || "";
        if (selectedFields.includes("keyboard")) row["Keyboard"] = customFields.keyboard || "";

        return row;
      });

      // Generate CSV
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [headers.join(",")];

      exportData.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header] || "";
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')
            ? `"${escaped}"`
            : escaped;
        });
        csvRows.push(values.join(","));
      });

      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assets-export-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${assets.length} assets successfully`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export assets");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Import assets with full AssetTiger support ──
  const importAssets = async (file: File) => {
    setIsImporting(true);
    setImportErrors([]);
    setImportProgress({ current: 0, total: 0 });

    try {
      const lookups = await fetchLookups();
      const rows = await parseFileToRows(file);

      if (rows.length === 0) {
        toast.error("File is empty or has no data rows");
        return { success: 0, errors: [] };
      }

      setImportProgress({ current: 0, total: rows.length });

      const errors: { row: number; error: string }[] = [];
      let successCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2; // header = row 1
        try {
          const row = rows[i];

          // ── Asset Tag (required) ──
          const assetTag = col(row, "Asset Tag ID", "asset_tag", "Asset Tag");
          if (!assetTag) {
            errors.push({ row: rowNum, error: "Asset Tag is required" });
            continue;
          }

          // ── Lookup resolution with auto-create ──
          const categoryName = col(row, "Category", "category");
          const categoryId = await findOrCreate(lookups.categories, categoryName, "itam_categories");

          const makeName = col(row, "Brand", "Brand (Make)", "make");
          const makeId = await findOrCreate(lookups.makes, makeName, "itam_makes");

          const siteName = col(row, "Site", "site");
          const siteId = await findOrCreateSite(lookups, siteName);

          const locationName = col(row, "Location", "location");
          const locationId = await findOrCreateLocation(lookups, locationName, siteId);

          const departmentName = col(row, "Department", "department");
          const departmentId = await findOrCreate(lookups.departments, departmentName, "itam_departments");

          const vendorName = col(row, "Purchased from", "Purchased From (Vendor)", "vendor", "Vendor");
          const vendorId = await findOrCreate(lookups.vendors, vendorName, "itam_vendors");

          // ── Status ──
          const rawStatus = col(row, "Status", "status");
          const status = rawStatus ? mapStatus(rawStatus) : "available";

          // ── Cost ──
          const purchasePrice = parseCost(col(row, "Cost", "purchase_price"));

          // ── Dates ──
          const purchaseDate = parseFlexibleDate(col(row, "Purchase Date", "purchase_date"));
          const warrantyExpiry = parseFlexibleDate(col(row, "Warranty Expiry", "warranty_expiry"));

          // ── Simple fields ──
          const description = col(row, "Description", "description");
          const name = description || assetTag; // AssetTiger uses "Description" as the name
          const model = col(row, "Model", "model");
          const serialNumber = col(row, "Serial No", "Serial Number", "serial_number");
          const eventNotes = col(row, "Event Notes", "Notes", "notes");

          // ── Custom fields ──
          const customFields: Record<string, any> = {};

          const photoUrl = col(row, "Asset Photo", "Photo URL", "photo_url");
          if (photoUrl) customFields.photo_url = photoUrl;

          const assignedToName = col(row, "Assigned to", "Assigned To", "assigned_to_name");
          if (assignedToName) {
            customFields.assigned_to_name = assignedToName;
            // Try to resolve to a user UUID
            const userId = findUserByName(lookups.users, assignedToName);
            if (userId) {
              // Will be set on assetData below after build
              customFields._resolved_user_id = userId;
            }
          }

          const createdBy = col(row, "Created by", "Created By", "created_by");
          if (createdBy) customFields.created_by = createdBy;

          const leasedTo = col(row, "Leased to", "Leased To", "leased_to");
          if (leasedTo) customFields.leased_to = leasedTo;

          const relation = col(row, "Relation", "relation");
          if (relation) customFields.relation = relation;

          const transactWhole = col(row, "Transact as a whole", "Transact as a Whole", "transact_as_whole");
          if (transactWhole) customFields.transact_as_whole = transactWhole;

          const eventDate = col(row, "Event Date", "event_date");
          if (eventDate) customFields.event_date = parseFlexibleDate(eventDate) || eventDate;

          const eventDueDate = col(row, "Event Due Date", "event_due_date");
          if (eventDueDate) customFields.event_due_date = parseFlexibleDate(eventDueDate) || eventDueDate;

          const assetConfig = col(row, "Asset Configuration", "Configuration", "asset_configuration");
          if (assetConfig) customFields.asset_configuration = assetConfig;

          const classification = col(row, "Asset Classification", "Classification", "classification");
          if (classification) {
            customFields.classification = classification.includes(",")
              ? classification.split(",").map((s) => s.trim())
              : classification;
          }

          const headphone = col(row, "Headphone", "headphone");
          if (headphone) customFields.headphone = headphone;

          const mouse = col(row, "Mouse", "mouse");
          if (mouse) customFields.mouse = mouse;

          const keyboard = col(row, "Keyboard", "keyboard");
          if (keyboard) customFields.keyboard = keyboard;

          // ── Resolve assigned user & Date Created ──
          const resolvedUserId = customFields._resolved_user_id;
          delete customFields._resolved_user_id; // Don't store this in custom_fields

          // ── Parse Date Created ──
          const dateCreatedRaw = col(row, "Date Created", "date_created", "created_at");
          const dateCreated = dateCreatedRaw ? parseFlexibleDate(dateCreatedRaw) : null;

          // ── Build asset record ──
          const assetData: any = {
            asset_tag: assetTag,
            asset_id: assetTag, // required non-null field
            name,
            description: description || null,
            model: model || null,
            serial_number: serialNumber || null,
            status,
            purchase_price: purchasePrice,
            purchase_date: purchaseDate,
            warranty_expiry: warrantyExpiry,
            notes: eventNotes || null,
            custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
          };

          // Set assigned_to UUID if resolved
          if (resolvedUserId) {
            assetData.assigned_to = resolvedUserId;
            // For "Checked out" / in_use status, also set checked_out_to
            if (status === "in_use") {
              assetData.checked_out_to = resolvedUserId;
              if (!assetData.checked_out_at) {
                assetData.checked_out_at = new Date().toISOString();
              }
            }
          }

          // Set created_at if Date Created column was provided
          if (dateCreated) {
            assetData.created_at = dateCreated;
          }

          if (categoryId) assetData.category_id = categoryId;
          if (makeId) assetData.make_id = makeId;
          if (locationId) assetData.location_id = locationId;
          if (departmentId) assetData.department_id = departmentId;
          if (vendorId) assetData.vendor_id = vendorId;

          // ── Depreciation fields (from template, not AssetTiger) ──
          const usefulLife = col(row, "Useful Life (Years)", "useful_life_years");
          if (usefulLife) assetData.useful_life_years = parseInt(usefulLife) || null;

          const salvageVal = col(row, "Salvage Value", "salvage_value");
          if (salvageVal) assetData.salvage_value = parseCost(salvageVal);

          const depMethod = col(row, "Depreciation Method", "depreciation_method");
          if (depMethod) assetData.depreciation_method = depMethod.toLowerCase().replace(/\s+/g, "_");

          // ── Check-then-insert/update (partial unique index doesn't support ON CONFLICT) ──
          const { data: existingAsset } = await supabase
            .from("itam_assets")
            .select("id")
            .eq("asset_tag", assetTag)
            .eq("is_active", true)
            .maybeSingle();

          let insertError;
          if (existingAsset) {
            const { error: updateErr } = await supabase
              .from("itam_assets")
              .update(assetData)
              .eq("id", existingAsset.id);
            insertError = updateErr;
          } else {
            const { error: insertErr } = await supabase
              .from("itam_assets")
              .insert(assetData);
            insertError = insertErr;
          }

          if (insertError) {
            errors.push({ row: rowNum, error: insertError.message });
          } else {
            successCount++;
          }
        } catch (rowError: any) {
          errors.push({ row: rowNum, error: rowError.message || "Unknown error" });
        }

        setImportProgress({ current: i + 1, total: rows.length });
      }

      setImportErrors(errors);

      if (successCount > 0) {
        toast.success(`Imported ${successCount} assets successfully`);
      }
      if (errors.length > 0) {
        toast.warning(`${errors.length} rows had errors`);
      }

      return { success: successCount, errors };
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Failed to import assets: " + error.message);
      return { success: 0, errors: [] };
    } finally {
      setIsImporting(false);
    }
  };

  // Generate import template
  const downloadTemplate = () => {
    const headers = [
      "Asset Tag ID",
      "Name",
      "Description",
      "Category",
      "Brand",
      "Model",
      "Serial No",
      "Status",
      "Cost",
      "Purchase Date",
      "Purchased from",
      "Location",
      "Site",
      "Department",
      "Warranty Expiry",
      "Notes",
      "Asset Configuration",
      "Asset Classification",
      "Assigned to",
      "Headphone",
      "Mouse",
      "Keyboard",
    ];

    const exampleRow = [
      "AST-0001",
      "Dell Latitude 5520",
      "Dell Laptop - Standard office",
      "Laptop",
      "Dell",
      "Latitude 5520",
      "ABC123456",
      "Available",
      "75000",
      "15/01/2024",
      "Dell India",
      "Head Office",
      "Mumbai",
      "IT Department",
      "15/01/2027",
      "Sample notes",
      "8GB RAM, 256GB SSD",
      "Hardware",
      "John Doe",
      "Yes",
      "Yes",
      "Yes",
    ];

    const csvContent = [headers.join(","), exampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asset-import-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded");
  };

  // ── Import Peripherals (Headphones, Mice, Keyboards) from Excel ──
  const importPeripherals = async (file: File) => {
    setIsImporting(true);
    setImportErrors([]);
    setImportProgress({ current: 0, total: 0 });

    const PERIPHERAL_DEFS = [
      { label: "Headphones", serialCol: 3, tagCol: 4, categoryName: "Headphones" },
      { label: "Mouse", serialCol: 5, tagCol: 6, categoryName: "Mouse" },
      { label: "Keyboard", serialCol: 7, tagCol: 8, categoryName: "Keyboard" },
    ];

    try {
      // Parse file using raw array approach for positional columns
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", raw: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      // Skip header row
      const dataRows = rawRows.slice(1).filter((r) => r.some((c) => String(c).trim()));
      if (dataRows.length === 0) {
        toast.error("No data rows found");
        return { success: 0, errors: [] };
      }

      // Fetch users for email resolution
      const { data: usersData } = await supabase.from("users").select("id, name, email");
      const users = usersData || [];
      const emailToUser = new Map<string, { id: string; name: string | null }>();
      users.forEach((u: any) => {
        if (u.email) emailToUser.set(u.email.toLowerCase(), { id: u.id, name: u.name });
      });

      // Resolve category IDs by name (auto-create if missing)
      const { data: catData } = await supabase.from("itam_categories").select("id, name").eq("is_active", true);
      const categoryLookup = (catData || []) as { id: string; name: string }[];
      const resolvedCategoryIds: Record<string, string> = {};
      for (const def of PERIPHERAL_DEFS) {
        const existing = categoryLookup.find(c => c.name.toLowerCase() === def.categoryName.toLowerCase());
        if (existing) {
          resolvedCategoryIds[def.categoryName] = existing.id;
        } else {
          const { data: newCat } = await supabase.from("itam_categories").insert({ name: def.categoryName }).select("id").single();
          if (newCat) resolvedCategoryIds[def.categoryName] = newCat.id;
        }
      }

      // Fetch existing asset tags for dedup
      const { data: existingAssets } = await supabase
        .from("itam_assets")
        .select("asset_tag")
        .eq("is_active", true);
      const existingTags = new Set((existingAssets || []).map((a: any) => a.asset_tag));

      const errors: { row: number; error: string }[] = [];
      let successCount = 0;
      let skippedNA = 0;
      let skippedDup = 0;

      const totalPossible = dataRows.length * 3;
      setImportProgress({ current: 0, total: totalPossible });
      let processed = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const rowNum = i + 2;
        const r = dataRows[i].map((c) => String(c).trim());

        const employeeName = r[1] || "";
        const rawEmail = (r[2] || "").toLowerCase().trim();

        // Fuzzy email matching: try exact match first, then match local part
        let user = rawEmail ? emailToUser.get(rawEmail) : null;
        if (!user && rawEmail) {
          const localPart = rawEmail.split("@")[0];
          for (const [email, u] of emailToUser.entries()) {
            if (email.split("@")[0] === localPart) {
              user = u;
              break;
            }
          }
        }
        const isStock = !rawEmail || employeeName.toLowerCase() === "stock";

        for (const def of PERIPHERAL_DEFS) {
          processed++;
          const serial = r[def.serialCol] || "";
          const tag = r[def.tagCol] || "";

          // Skip NA or empty
          if (!serial || !tag || serial.toUpperCase() === "NA" || tag.toUpperCase() === "NA") {
            skippedNA++;
            setImportProgress({ current: processed, total: totalPossible });
            continue;
          }

          // Skip duplicates
          if (existingTags.has(tag)) {
            skippedDup++;
            errors.push({ row: rowNum, error: `${def.label} tag "${tag}" already exists, skipped` });
            setImportProgress({ current: processed, total: totalPossible });
            continue;
          }

          const assetName = isStock ? `${def.label} - Stock` : def.label;

          const assetData: any = {
            asset_tag: tag,
            asset_id: tag,
            name: assetName,
            serial_number: serial,
            category_id: resolvedCategoryIds[def.categoryName] || null,
            status: isStock ? "available" : "in_use",
            is_active: true,
          };

          if (user && !isStock) {
            assetData.assigned_to = user.id;
            assetData.checked_out_to = user.id;
            assetData.checked_out_at = new Date().toISOString();
          }

          try {
            const { error: insertErr } = await supabase.from("itam_assets").insert(assetData);
            if (insertErr) {
              errors.push({ row: rowNum, error: `${def.label}: ${insertErr.message}` });
            } else {
              successCount++;
              existingTags.add(tag); // prevent intra-batch duplicates
            }
          } catch (err: any) {
            errors.push({ row: rowNum, error: `${def.label}: ${err.message}` });
          }

          setImportProgress({ current: processed, total: totalPossible });
        }

        // Log unresolved emails (not stock)
        if (!isStock && !user && rawEmail) {
          errors.push({ row: rowNum, error: `Email "${rawEmail}" not found in users table` });
        }
      }

      setImportErrors(errors);

      const msg = `Imported ${successCount} peripherals. Skipped: ${skippedNA} NA, ${skippedDup} duplicates.`;
      if (successCount > 0) toast.success(msg);
      else toast.info(msg);
      if (errors.filter((e) => !e.error.includes("already exists") && !e.error.includes("not found")).length > 0) {
        toast.warning(`${errors.length} rows had warnings/errors`);
      }

      return { success: successCount, errors };
    } catch (error: any) {
      console.error("Peripheral import error:", error);
      toast.error("Failed to import peripherals: " + error.message);
      return { success: 0, errors: [] };
    } finally {
      setIsImporting(false);
    }
  };

  return {
    exportAssets,
    importAssets,
    importPeripherals,
    downloadTemplate,
    isExporting,
    isImporting,
    importProgress,
    importErrors,
    EXPORT_FIELD_GROUPS,
    getDefaultSelectedFields,
  };
}
