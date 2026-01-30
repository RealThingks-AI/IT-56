import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

// Types for lookup tables
interface LookupItem {
  id: string;
  name: string;
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
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
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

export function useAssetExportImport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);

  // Fetch all lookup tables
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

  // Export assets with proper field mapping
  const exportAssets = async (selectedFields: string[]) => {
    setIsExporting(true);
    try {
      // Fetch assets with all related data
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!assets || assets.length === 0) {
        toast.error("No assets to export");
        return;
      }

      // Map assets to export format
      const exportData = assets.map((asset: any) => {
        const customFields = typeof asset.custom_fields === "object" && asset.custom_fields !== null
          ? asset.custom_fields
          : {};

        const row: Record<string, string> = {};

        // Build row based on selected fields
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
        if (selectedFields.includes("assigned_to")) row["Assigned To"] = asset.assigned_to || "";
        if (selectedFields.includes("checked_out_to")) row["Checked Out To"] = asset.checked_out_to || "";
        if (selectedFields.includes("checked_out_at")) row["Check Out Date"] = formatDate(asset.checked_out_at);
        if (selectedFields.includes("expected_return_date")) row["Expected Return"] = formatDate(asset.expected_return_date);
        if (selectedFields.includes("useful_life_years")) row["Useful Life (Years)"] = asset.useful_life_years?.toString() || "";
        if (selectedFields.includes("salvage_value")) row["Salvage Value"] = formatCurrency(asset.salvage_value);
        if (selectedFields.includes("depreciation_method")) row["Depreciation Method"] = formatStatus(asset.depreciation_method);
        if (selectedFields.includes("asset_configuration")) row["Configuration"] = customFields.asset_configuration || "";
        if (selectedFields.includes("classification")) {
          const classificationValue = customFields.classification;
          row["Classification"] = Array.isArray(classificationValue)
            ? classificationValue.join(", ")
            : classificationValue || "";
        }
        if (selectedFields.includes("photo_url")) row["Photo URL"] = customFields.photo_url || "";

        return row;
      });

      // Generate CSV
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [headers.join(",")];

      exportData.forEach((row) => {
        const values = headers.map((header) => {
          const value = row[header] || "";
          // Escape quotes and wrap in quotes if contains comma or newline
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')
            ? `"${escaped}"`
            : escaped;
        });
        csvRows.push(values.join(","));
      });

      const csvContent = csvRows.join("\n");
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

  // Import assets with field mapping and validation
  const importAssets = async (file: File) => {
    setIsImporting(true);
    setImportErrors([]);
    setImportProgress({ current: 0, total: 0 });

    try {
      // Fetch lookups for mapping names to IDs
      const lookups = await fetchLookups();

      // Parse CSV file
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      
      if (lines.length < 2) {
        toast.error("File is empty or has no data rows");
        return { success: 0, errors: [] };
      }

      const headers = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1);
      setImportProgress({ current: 0, total: dataRows.length });

      const errors: { row: number; error: string }[] = [];
      let successCount = 0;

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const rowNum = i + 2; // Account for header and 0-index
        try {
          const values = parseCSVLine(dataRows[i]);
          const row: Record<string, string> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
          });

          // Map CSV columns to database fields
          const assetTag = row["Asset Tag ID"] || row["asset_tag"] || "";
          if (!assetTag) {
            errors.push({ row: rowNum, error: "Asset Tag is required" });
            continue;
          }

          // Find related IDs
          const categoryName = row["Category"] || row["category"] || "";
          const category = lookups.categories.find(
            (c) => c.name.toLowerCase() === categoryName.toLowerCase()
          );

          const makeName = row["Brand (Make)"] || row["make"] || row["Brand"] || "";
          const make = lookups.makes.find(
            (m) => m.name.toLowerCase() === makeName.toLowerCase()
          );

          const locationName = row["Location"] || row["location"] || "";
          const location = lookups.locations.find(
            (l) => l.name.toLowerCase() === locationName.toLowerCase()
          );

          const departmentName = row["Department"] || row["department"] || "";
          const department = lookups.departments.find(
            (d) => d.name.toLowerCase() === departmentName.toLowerCase()
          );

          const vendorName = row["Purchased From (Vendor)"] || row["vendor"] || row["Vendor"] || "";
          const vendor = lookups.vendors.find(
            (v) => v.name.toLowerCase() === vendorName.toLowerCase()
          );

          // Parse status
          let status = (row["Status"] || row["status"] || "available").toLowerCase().replace(/\s+/g, "_");
          const validStatuses = ["available", "in_use", "maintenance", "retired", "disposed", "lost"];
          if (!validStatuses.includes(status)) {
            status = "available";
          }

          // Parse cost
          let purchasePrice: number | null = null;
          const costStr = row["Cost"] || row["purchase_price"] || "";
          if (costStr) {
            const numericStr = costStr.replace(/[^0-9.-]/g, "");
            purchasePrice = parseFloat(numericStr) || null;
          }

          // Parse dates
          const parseDateStr = (dateStr: string): string | null => {
            if (!dateStr) return null;
            try {
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                return format(date, "yyyy-MM-dd");
              }
            } catch {
              return null;
            }
            return null;
          };

          const purchaseDate = parseDateStr(row["Purchase Date"] || row["purchase_date"] || "");
          const warrantyExpiry = parseDateStr(row["Warranty Expiry"] || row["warranty_expiry"] || "");

          // Build custom_fields
          const customFields: Record<string, any> = {};
          if (row["Configuration"] || row["asset_configuration"]) {
            customFields.asset_configuration = row["Configuration"] || row["asset_configuration"];
          }
          if (row["Classification"] || row["classification"]) {
            const classValue = row["Classification"] || row["classification"];
            customFields.classification = classValue.includes(",")
              ? classValue.split(",").map((s) => s.trim())
              : classValue;
          }
          if (row["Photo URL"] || row["photo_url"]) {
            customFields.photo_url = row["Photo URL"] || row["photo_url"];
          }

          // Build asset record
          const assetData: any = {
            asset_tag: assetTag,
            name: row["Name"] || row["name"] || assetTag,
            description: row["Description"] || row["description"] || null,
            model: row["Model"] || row["model"] || null,
            serial_number: row["Serial Number"] || row["serial_number"] || null,
            status,
            purchase_price: purchasePrice,
            purchase_date: purchaseDate,
            warranty_expiry: warrantyExpiry,
            notes: row["Notes"] || row["notes"] || null,
            custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
          };

          // Add foreign keys if found
          if (category) assetData.category_id = category.id;
          if (make) assetData.make_id = make.id;
          if (location) assetData.location_id = location.id;
          if (department) assetData.department_id = department.id;
          if (vendor) assetData.vendor_id = vendor.id;

          // Parse depreciation fields
          if (row["Useful Life (Years)"] || row["useful_life_years"]) {
            assetData.useful_life_years = parseInt(row["Useful Life (Years)"] || row["useful_life_years"]) || null;
          }
          if (row["Salvage Value"] || row["salvage_value"]) {
            const salvageStr = (row["Salvage Value"] || row["salvage_value"]).replace(/[^0-9.-]/g, "");
            assetData.salvage_value = parseFloat(salvageStr) || null;
          }
          if (row["Depreciation Method"] || row["depreciation_method"]) {
            assetData.depreciation_method = (row["Depreciation Method"] || row["depreciation_method"])
              .toLowerCase()
              .replace(/\s+/g, "_");
          }

          // Insert or update asset
          const { error: insertError } = await supabase.from("itam_assets").upsert(assetData, {
            onConflict: "asset_tag",
          });

          if (insertError) {
            errors.push({ row: rowNum, error: insertError.message });
          } else {
            successCount++;
          }
        } catch (rowError: any) {
          errors.push({ row: rowNum, error: rowError.message || "Unknown error" });
        }

        setImportProgress({ current: i + 1, total: dataRows.length });
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
      "Brand (Make)",
      "Model",
      "Serial Number",
      "Status",
      "Location",
      "Department",
      "Cost",
      "Purchase Date",
      "Purchased From (Vendor)",
      "Warranty Expiry",
      "Notes",
      "Configuration",
      "Classification",
    ];

    const exampleRow = [
      "AST-0001",
      "Dell Laptop",
      "Standard office laptop",
      "Laptop",
      "Dell",
      "Latitude 5520",
      "ABC123456",
      "available",
      "Head Office",
      "IT Department",
      "75000",
      "2024-01-15",
      "Dell India",
      "2027-01-15",
      "Sample notes",
      "8GB RAM, 256GB SSD",
      "Hardware, Computing",
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

  return {
    exportAssets,
    importAssets,
    downloadTemplate,
    isExporting,
    isImporting,
    importProgress,
    importErrors,
    EXPORT_FIELD_GROUPS,
    getDefaultSelectedFields,
  };
}
