/**
 * Shared CSV / formatting utilities used by asset report generators.
 */

export function generateCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines: string[] = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(String(row[h] ?? ""))).join(","));
  }
  return lines.join("\n");
}

export function downloadCSV(csv: string, fileNameBase: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileNameBase}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "N/A";
  const isWhole = Number.isInteger(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: isWhole ? 0 : 2, maximumFractionDigits: isWhole ? 0 : 2 }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "N/A";
  }
}
