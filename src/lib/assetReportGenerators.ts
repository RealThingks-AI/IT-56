import { generateCSV, downloadCSV, formatCurrency, formatDate } from "./reportUtils";
import { toast } from "sonner";

export interface ReportData {
  assets: any[];
  assignments: any[];
  licenses: any[];
  repairs: any[];
  maintenanceSchedules: any[];
  assetHistory: any[];
  sites: any[];
  locations: any[];
  departments: any[];
  categories: any[];
}

// ============= ASSET REPORTS =============

export const generateAssetByTagReport = (data: ReportData) => {
  if (!data.assets.length) {
    toast.error("No assets found");
    return;
  }
  const headers = ["Asset Tag", "Name", "Category", "Status", "Location", "Purchase Date", "Purchase Price"];
  const rows = data.assets.map(asset => ({
    "Asset Tag": asset.asset_tag || "N/A",
    "Name": asset.name,
    "Category": data.categories.find(c => c.id === asset.category_id)?.name || "N/A",
    "Status": asset.status || "N/A",
    "Location": data.locations.find(l => l.id === asset.location_id)?.name || "N/A",
    "Purchase Date": formatDate(asset.purchase_date),
    "Purchase Price": formatCurrency(asset.purchase_price)
  }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "assets_by_tag");
  toast.success("Report downloaded");
};

export const generateAssetByTagWithPicturesReport = (data: ReportData) => {
  if (!data.assets.length) {
    toast.error("No assets found");
    return;
  }
  const headers = ["Asset Tag", "Name", "Photo URL", "Category", "Status", "Location"];
  const rows = data.assets.map(asset => ({
    "Asset Tag": asset.asset_tag || "N/A",
    "Name": asset.name,
    "Photo URL": asset.photo_url || "No Photo",
    "Category": data.categories.find(c => c.id === asset.category_id)?.name || "N/A",
    "Status": asset.status || "N/A",
    "Location": data.locations.find(l => l.id === asset.location_id)?.name || "N/A"
  }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "assets_by_tag_with_pictures");
  toast.success("Report downloaded");
};

export const generateAssetByCategoryReport = (data: ReportData) => {
  if (!data.assets.length) {
    toast.error("No assets found");
    return;
  }
  const headers = ["Category", "Asset Tag", "Name", "Status", "Location", "Purchase Price"];
  const rows = data.assets
    .sort((a, b) => (a.category_id || "").localeCompare(b.category_id || ""))
    .map(asset => ({
      "Category": data.categories.find(c => c.id === asset.category_id)?.name || "Uncategorized",
      "Asset Tag": asset.asset_tag || "N/A",
      "Name": asset.name,
      "Status": asset.status || "N/A",
      "Location": data.locations.find(l => l.id === asset.location_id)?.name || "N/A",
      "Purchase Price": formatCurrency(asset.purchase_price)
    }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "assets_by_category");
  toast.success("Report downloaded");
};

export const generateAssetBySiteReport = (data: ReportData) => {
  if (!data.assets.length) {
    toast.error("No assets found");
    return;
  }
  const headers = ["Site", "Location", "Asset Tag", "Name", "Status", "Category"];
  const rows = data.assets.map(asset => {
    const location = data.locations.find(l => l.id === asset.location_id);
    const site = data.sites.find(s => s.id === location?.site_id);
    return {
      "Site": site?.name || "N/A",
      "Location": location?.name || "N/A",
      "Asset Tag": asset.asset_tag || "N/A",
      "Name": asset.name,
      "Status": asset.status || "N/A",
      "Category": data.categories.find(c => c.id === asset.category_id)?.name || "N/A"
    };
  });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "assets_by_site");
  toast.success("Report downloaded");
};

export const generateAssetByDepartmentReport = (data: ReportData) => {
  if (!data.assets.length) {
    toast.error("No assets found");
    return;
  }
  const headers = ["Department", "Asset Tag", "Name", "Status", "Category", "Purchase Price"];
  const rows = data.assets.map(asset => ({
    "Department": data.departments.find(d => d.id === asset.department_id)?.name || "Unassigned",
    "Asset Tag": asset.asset_tag || "N/A",
    "Name": asset.name,
    "Status": asset.status || "N/A",
    "Category": data.categories.find(c => c.id === asset.category_id)?.name || "N/A",
    "Purchase Price": formatCurrency(asset.purchase_price)
  }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "assets_by_department");
  toast.success("Report downloaded");
};

export const generateAssetByWarrantyReport = (data: ReportData) => {
  const assetsWithWarranty = data.assets.filter(a => a.warranty_expiry);
  if (!assetsWithWarranty.length) {
    toast.error("No assets with warranty info found");
    return;
  }
  const headers = ["Asset Tag", "Name", "Warranty Expiry", "Warranty Status", "Category", "Vendor"];
  const rows = assetsWithWarranty.map(asset => ({
    "Asset Tag": asset.asset_tag || "N/A",
    "Name": asset.name,
    "Warranty Expiry": formatDate(asset.warranty_expiry),
    "Warranty Status": new Date(asset.warranty_expiry) > new Date() ? "Active" : "Expired",
    "Category": data.categories.find(c => c.id === asset.category_id)?.name || "N/A",
    "Vendor": asset.vendor_name || "N/A"
  }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "assets_by_warranty");
  toast.success("Report downloaded");
};

export const generateAssetByLinkedReport = (data: ReportData) => {
  const linkedAssets = data.assets.filter(a => a.parent_asset_id);
  if (!linkedAssets.length) {
    toast.error("No linked assets found");
    return;
  }
  const headers = ["Asset Tag", "Name", "Parent Asset Tag", "Parent Name", "Status"];
  const rows = linkedAssets.map(asset => {
    const parent = data.assets.find(a => a.id === asset.parent_asset_id);
    return {
      "Asset Tag": asset.asset_tag || "N/A",
      "Name": asset.name,
      "Parent Asset Tag": parent?.asset_tag || "N/A",
      "Parent Name": parent?.name || "N/A",
      "Status": asset.status || "N/A"
    };
  });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "assets_linked");
  toast.success("Report downloaded");
};

// ============= AUDIT REPORTS =============

export const generateAuditByAssetTagReport = (data: ReportData) => {
  const auditRecords = data.assetHistory.filter(h => h.action === "audit");
  if (!auditRecords.length) {
    toast.error("No audit records found");
    return;
  }
  const headers = ["Asset Tag", "Asset Name", "Audit Date", "Audited By", "Notes"];
  const rows = auditRecords.map(record => {
    const asset = data.assets.find(a => a.id === record.asset_id);
    return {
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Audit Date": formatDate(record.created_at),
      "Audited By": record.performed_by || "N/A",
      "Notes": record.notes || "N/A"
    };
  });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "audit_by_asset_tag");
  toast.success("Report downloaded");
};

export const generateAuditByDateReport = (data: ReportData) => {
  const auditRecords = data.assetHistory.filter(h => h.action === "audit");
  if (!auditRecords.length) {
    toast.error("No audit records found");
    return;
  }
  const headers = ["Audit Date", "Asset Tag", "Asset Name", "Location", "Audited By"];
  const rows = auditRecords
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(record => {
      const asset = data.assets.find(a => a.id === record.asset_id);
      return {
        "Audit Date": formatDate(record.created_at),
        "Asset Tag": asset?.asset_tag || "N/A",
        "Asset Name": asset?.name || "N/A",
        "Location": data.locations.find(l => l.id === asset?.location_id)?.name || "N/A",
        "Audited By": record.performed_by || "N/A"
      };
    });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "audit_by_date");
  toast.success("Report downloaded");
};

export const generateNonAuditedAssetsReport = (data: ReportData) => {
  const auditedAssetIds = new Set(data.assetHistory.filter(h => h.action === "audit").map(h => h.asset_id));
  const nonAudited = data.assets.filter(a => !auditedAssetIds.has(a.id));
  if (!nonAudited.length) {
    toast.info("All assets have been audited");
    return;
  }
  const headers = ["Asset Tag", "Name", "Category", "Location", "Status"];
  const rows = nonAudited.map(asset => ({
    "Asset Tag": asset.asset_tag || "N/A",
    "Name": asset.name,
    "Category": data.categories.find(c => c.id === asset.category_id)?.name || "N/A",
    "Location": data.locations.find(l => l.id === asset.location_id)?.name || "N/A",
    "Status": asset.status || "N/A"
  }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "non_audited_assets");
  toast.success("Report downloaded");
};

// ============= CHECK-OUT REPORTS =============

export const generateCheckoutByPersonReport = (data: ReportData) => {
  const activeAssignments = data.assignments.filter(a => !a.returned_at);
  if (!activeAssignments.length) {
    toast.error("No active check-outs found");
    return;
  }
  const headers = ["Assigned To", "Asset Tag", "Asset Name", "Check-Out Date", "Due Date", "Notes"];
  const rows = activeAssignments
    .sort((a, b) => (a.assigned_to || "").localeCompare(b.assigned_to || ""))
    .map(assignment => {
      const asset = data.assets.find(a => a.id === assignment.asset_id);
      return {
        "Assigned To": assignment.assigned_to || "N/A",
        "Asset Tag": asset?.asset_tag || "N/A",
        "Asset Name": asset?.name || "N/A",
        "Check-Out Date": formatDate(assignment.assigned_at),
        "Due Date": formatDate(assignment.due_date),
        "Notes": assignment.notes || "N/A"
      };
    });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "checkout_by_person");
  toast.success("Report downloaded");
};

export const generateCheckoutByAssetReport = (data: ReportData) => {
  if (!data.assignments.length) {
    toast.error("No check-out records found");
    return;
  }
  const headers = ["Asset Tag", "Asset Name", "Assigned To", "Check-Out Date", "Return Date", "Status"];
  const rows = data.assignments.map(assignment => {
    const asset = data.assets.find(a => a.id === assignment.asset_id);
    return {
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Assigned To": assignment.assigned_to || "N/A",
      "Check-Out Date": formatDate(assignment.assigned_at),
      "Return Date": assignment.returned_at ? formatDate(assignment.returned_at) : "Still Out",
      "Status": assignment.returned_at ? "Returned" : "Active"
    };
  });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "checkout_by_asset");
  toast.success("Report downloaded");
};

export const generateCheckoutByDueDateReport = (data: ReportData) => {
  const withDueDate = data.assignments.filter(a => !a.returned_at && a.due_date);
  if (!withDueDate.length) {
    toast.error("No assignments with due dates found");
    return;
  }
  const headers = ["Due Date", "Asset Tag", "Asset Name", "Assigned To", "Check-Out Date"];
  const rows = withDueDate
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .map(assignment => {
      const asset = data.assets.find(a => a.id === assignment.asset_id);
      return {
        "Due Date": formatDate(assignment.due_date),
        "Asset Tag": asset?.asset_tag || "N/A",
        "Asset Name": asset?.name || "N/A",
        "Assigned To": assignment.assigned_to || "N/A",
        "Check-Out Date": formatDate(assignment.assigned_at)
      };
    });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "checkout_by_due_date");
  toast.success("Report downloaded");
};

export const generateCheckoutPastDueReport = (data: ReportData) => {
  const now = new Date();
  const pastDue = data.assignments.filter(a => !a.returned_at && a.due_date && new Date(a.due_date) < now);
  if (!pastDue.length) {
    toast.info("No past due assignments");
    return;
  }
  const headers = ["Due Date", "Days Overdue", "Asset Tag", "Asset Name", "Assigned To"];
  const rows = pastDue.map(assignment => {
    const asset = data.assets.find(a => a.id === assignment.asset_id);
    const daysOverdue = Math.floor((now.getTime() - new Date(assignment.due_date).getTime()) / (1000 * 60 * 60 * 24));
    return {
      "Due Date": formatDate(assignment.due_date),
      "Days Overdue": daysOverdue,
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Assigned To": assignment.assigned_to || "N/A"
    };
  });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "checkout_past_due");
  toast.success("Report downloaded");
};

// ============= CONTRACT REPORTS =============

export const generateContractByContractReport = (data: ReportData) => {
  if (!data.licenses.length) {
    toast.error("No contracts/licenses found");
    return;
  }
  const headers = ["Contract/License Name", "Type", "Start Date", "Expiry Date", "Seats Total", "Seats Allocated", "Status"];
  const rows = data.licenses.map(license => ({
    "Contract/License Name": license.name,
    "Type": license.license_type || "N/A",
    "Start Date": formatDate(license.purchase_date),
    "Expiry Date": formatDate(license.expiry_date),
    "Seats Total": license.seats_total || 0,
    "Seats Allocated": license.seats_allocated || 0,
    "Status": license.expiry_date && new Date(license.expiry_date) > new Date() ? "Active" : "Expired"
  }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "contracts_list");
  toast.success("Report downloaded");
};

export const generateContractByAssetReport = (data: ReportData) => {
  const assetsWithContract = data.assets.filter(a => a.warranty_expiry || a.contract_id);
  if (!assetsWithContract.length) {
    toast.error("No assets with contracts found");
    return;
  }
  const headers = ["Asset Tag", "Asset Name", "Contract/Warranty", "Expiry Date", "Status"];
  const rows = assetsWithContract.map(asset => ({
    "Asset Tag": asset.asset_tag || "N/A",
    "Asset Name": asset.name,
    "Contract/Warranty": asset.warranty_expiry ? "Warranty" : "Contract",
    "Expiry Date": formatDate(asset.warranty_expiry),
    "Status": new Date(asset.warranty_expiry) > new Date() ? "Active" : "Expired"
  }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "contracts_by_asset");
  toast.success("Report downloaded");
};

export const generateSoftwareLicenseReport = (data: ReportData) => {
  const softwareLicenses = data.licenses.filter(l => l.license_type === "software" || l.license_type === "Software");
  if (!softwareLicenses.length) {
    toast.error("No software licenses found");
    return;
  }
  const headers = ["License Name", "Vendor", "Seats Total", "Seats Allocated", "Available", "Expiry Date"];
  const rows = softwareLicenses.map(license => ({
    "License Name": license.name,
    "Vendor": license.vendor_name || "N/A",
    "Seats Total": license.seats_total || 0,
    "Seats Allocated": license.seats_allocated || 0,
    "Available": (license.seats_total || 0) - (license.seats_allocated || 0),
    "Expiry Date": formatDate(license.expiry_date)
  }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "software_licenses");
  toast.success("Report downloaded");
};

// ============= MAINTENANCE REPORTS =============

export const generateMaintenanceByAssetReport = (data: ReportData) => {
  if (!data.maintenanceSchedules.length && !data.repairs.length) {
    toast.error("No maintenance records found");
    return;
  }
  const headers = ["Asset Tag", "Asset Name", "Type", "Description", "Date", "Status", "Cost"];
  const maintenanceRows = data.maintenanceSchedules.map(m => {
    const asset = data.assets.find(a => a.id === m.asset_id);
    return {
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Type": "Scheduled",
      "Description": m.description || "N/A",
      "Date": formatDate(m.scheduled_date),
      "Status": m.status || "Pending",
      "Cost": formatCurrency(m.cost)
    };
  });
  const repairRows = data.repairs.map(r => {
    const asset = data.assets.find(a => a.id === r.asset_id);
    return {
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Type": "Repair",
      "Description": r.issue_description || "N/A",
      "Date": formatDate(r.created_at),
      "Status": r.status || "N/A",
      "Cost": formatCurrency(r.cost)
    };
  });
  const csv = generateCSV([...maintenanceRows, ...repairRows], headers);
  downloadCSV(csv, "maintenance_by_asset");
  toast.success("Report downloaded");
};

export const generateMaintenancePastDueReport = (data: ReportData) => {
  const now = new Date();
  const pastDue = data.maintenanceSchedules.filter(m => 
    m.status !== "completed" && m.scheduled_date && new Date(m.scheduled_date) < now
  );
  if (!pastDue.length) {
    toast.info("No past due maintenance tasks");
    return;
  }
  const headers = ["Asset Tag", "Asset Name", "Description", "Scheduled Date", "Days Overdue"];
  const rows = pastDue.map(m => {
    const asset = data.assets.find(a => a.id === m.asset_id);
    const daysOverdue = Math.floor((now.getTime() - new Date(m.scheduled_date).getTime()) / (1000 * 60 * 60 * 24));
    return {
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Description": m.description || "N/A",
      "Scheduled Date": formatDate(m.scheduled_date),
      "Days Overdue": daysOverdue
    };
  });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "maintenance_past_due");
  toast.success("Report downloaded");
};

// ============= AUDIT BY SITE REPORT =============

export const generateAuditBySiteReport = (data: ReportData) => {
  const auditRecords = data.assetHistory.filter(h => h.action === "audit");
  if (!auditRecords.length) {
    toast.error("No audit records found");
    return;
  }
  const headers = ["Site", "Location", "Asset Tag", "Asset Name", "Audit Date", "Audited By"];
  const rows = auditRecords.map(record => {
    const asset = data.assets.find(a => a.id === record.asset_id);
    const location = data.locations.find(l => l.id === asset?.location_id);
    const site = data.sites.find(s => s.id === location?.site_id);
    return {
      "Site": site?.name || "N/A",
      "Location": location?.name || "N/A",
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Audit Date": formatDate(record.created_at),
      "Audited By": record.performed_by || "N/A"
    };
  });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "audit_by_site");
  toast.success("Report downloaded");
};

// ============= CHECKOUT BY SITE REPORT =============

export const generateCheckoutBySiteReport = (data: ReportData) => {
  const active = data.assignments.filter(a => !a.returned_at);
  if (!active.length) {
    toast.error("No active check-outs found");
    return;
  }
  const headers = ["Site", "Location", "Asset Tag", "Asset Name", "Assigned To", "Check-Out Date"];
  const rows = active.map(assignment => {
    const asset = data.assets.find(a => a.id === assignment.asset_id);
    const location = data.locations.find(l => l.id === asset?.location_id);
    const site = data.sites.find(s => s.id === location?.site_id);
    return {
      "Site": site?.name || "N/A",
      "Location": location?.name || "N/A",
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Assigned To": assignment.assigned_to || "N/A",
      "Check-Out Date": formatDate(assignment.assigned_at)
    };
  });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "checkout_by_site");
  toast.success("Report downloaded");
};

// ============= MAINTENANCE BY PERSON REPORT =============

export const generateMaintenanceByPersonReport = (data: ReportData) => {
  if (!data.maintenanceSchedules.length && !data.repairs.length) {
    toast.error("No maintenance records found");
    return;
  }
  const headers = ["Assigned To", "Asset Tag", "Asset Name", "Type", "Description", "Date", "Status"];
  const maintenanceRows = data.maintenanceSchedules.map(m => {
    const asset = data.assets.find(a => a.id === m.asset_id);
    return {
      "Assigned To": m.assigned_to || "Unassigned",
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Type": "Scheduled",
      "Description": m.description || "N/A",
      "Date": formatDate(m.scheduled_date),
      "Status": m.status || "Pending"
    };
  });
  const repairRows = data.repairs.map(r => {
    const asset = data.assets.find(a => a.id === r.asset_id);
    return {
      "Assigned To": r.assigned_to || "Unassigned",
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Type": "Repair",
      "Description": r.issue_description || "N/A",
      "Date": formatDate(r.created_at),
      "Status": r.status || "N/A"
    };
  });
  const allRows = [...maintenanceRows, ...repairRows].sort((a, b) => 
    (a["Assigned To"]).localeCompare(b["Assigned To"])
  );
  const csv = generateCSV(allRows, headers);
  downloadCSV(csv, "maintenance_by_person");
  toast.success("Report downloaded");
};

// ============= MAINTENANCE HISTORY BY DATE REPORT =============

export const generateMaintenanceHistoryByDateReport = (data: ReportData) => {
  if (!data.maintenanceSchedules.length && !data.repairs.length) {
    toast.error("No maintenance records found");
    return;
  }
  const headers = ["Date", "Asset Tag", "Asset Name", "Type", "Description", "Status", "Cost"];
  const maintenanceRows = data.maintenanceSchedules.map(m => {
    const asset = data.assets.find(a => a.id === m.asset_id);
    return {
      "Date": formatDate(m.scheduled_date),
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Type": "Scheduled",
      "Description": m.description || "N/A",
      "Status": m.status || "Pending",
      "Cost": formatCurrency(m.cost)
    };
  });
  const repairRows = data.repairs.map(r => {
    const asset = data.assets.find(a => a.id === r.asset_id);
    return {
      "Date": formatDate(r.created_at),
      "Asset Tag": asset?.asset_tag || "N/A",
      "Asset Name": asset?.name || "N/A",
      "Type": "Repair",
      "Description": r.issue_description || "N/A",
      "Status": r.status || "N/A",
      "Cost": formatCurrency(r.cost)
    };
  });
  const allRows = [...maintenanceRows, ...repairRows].sort((a, b) => 
    new Date(b["Date"]).getTime() - new Date(a["Date"]).getTime()
  );
  const csv = generateCSV(allRows, headers);
  downloadCSV(csv, "maintenance_history_by_date");
  toast.success("Report downloaded");
};

// ============= STATUS REPORTS =============

export const generateStatusReport = (data: ReportData, status: string, filename: string) => {
  const filtered = data.assets.filter(a => a.status?.toLowerCase() === status.toLowerCase());
  if (!filtered.length) {
    toast.info(`No ${status} assets found`);
    return;
  }
  const headers = ["Asset Tag", "Name", "Category", "Location", "Purchase Date", "Notes"];
  const rows = filtered.map(asset => ({
    "Asset Tag": asset.asset_tag || "N/A",
    "Name": asset.name,
    "Category": data.categories.find(c => c.id === asset.category_id)?.name || "N/A",
    "Location": data.locations.find(l => l.id === asset.location_id)?.name || "N/A",
    "Purchase Date": formatDate(asset.purchase_date),
    "Notes": asset.notes || "N/A"
  }));
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, filename);
  toast.success("Report downloaded");
};

// ============= TRANSACTION REPORTS =============

export const generateTransactionReport = (data: ReportData, actionType?: string, filename?: string) => {
  let records = data.assetHistory;
  if (actionType) {
    records = records.filter(h => h.action?.toLowerCase() === actionType.toLowerCase());
  }
  if (!records.length) {
    toast.error(`No ${actionType || "transaction"} records found`);
    return;
  }
  const headers = ["Date", "Asset Tag", "Asset Name", "Action", "Performed By", "Details"];
  const rows = records
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(record => {
      const asset = data.assets.find(a => a.id === record.asset_id);
      return {
        "Date": formatDate(record.created_at),
        "Asset Tag": asset?.asset_tag || "N/A",
        "Asset Name": asset?.name || "N/A",
        "Action": record.action || "N/A",
        "Performed By": record.performed_by || "N/A",
        "Details": record.notes || record.changes_json || "N/A"
      };
    });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, filename || "transactions");
  toast.success("Report downloaded");
};

export const generateTransactionHistoryReport = (data: ReportData) => {
  generateTransactionReport(data, undefined, "transaction_history");
};

export const generateActionsByUserReport = (data: ReportData) => {
  if (!data.assetHistory.length) {
    toast.error("No transaction records found");
    return;
  }
  const headers = ["User", "Action", "Asset Tag", "Asset Name", "Date"];
  const rows = data.assetHistory
    .sort((a, b) => (a.performed_by || "").localeCompare(b.performed_by || ""))
    .map(record => {
      const asset = data.assets.find(a => a.id === record.asset_id);
      return {
        "User": record.performed_by || "System",
        "Action": record.action || "N/A",
        "Asset Tag": asset?.asset_tag || "N/A",
        "Asset Name": asset?.name || "N/A",
        "Date": formatDate(record.created_at)
      };
    });
  const csv = generateCSV(rows, headers);
  downloadCSV(csv, "actions_by_user");
  toast.success("Report downloaded");
};
