import { toast } from "sonner";

export const exportCSV = (rows: Record<string, string | number>[], filename: string) => {
  if (rows.length === 0) { toast.info("No data to export"); return; }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} records`);
};
