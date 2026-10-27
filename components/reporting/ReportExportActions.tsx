"use client";

import { useMemo } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";

export default function ReportExportActions({
  fileName,
  rows,
  reportTitle,
  generatedAt,
  filters,
}: {
  fileName: string;
  rows: Array<Record<string, string | number | boolean | null | undefined>>;
  reportTitle?: string;
  generatedAt?: string;
  filters?: Record<string, string | number | boolean | null | undefined>;
}) {
  const csvContent = useMemo(() => {
    if (!rows.length) return "";
    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>()),
    );
    const metadata = [
      ["Report", reportTitle ?? fileName],
      ["Generated At", generatedAt ?? new Date().toISOString()],
      ...Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    ];
    const lines = [
      ...metadata.map(([key, value]) => `"${String(key).replace(/"/g, '""')}","${String(value).replace(/"/g, '""')}"`),
      "",
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const raw = row[header];
            const value = raw == null ? "" : String(raw);
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(","),
      ),
    ];
    return lines.join("\n");
  }, [fileName, filters, generatedAt, reportTitle, rows]);

  const handleExport = () => {
    if (!csvContent) {
      return;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExcelExport = () => {
    if (!rows.length) return;
    const headers = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()));
    const escape = (value: unknown) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const metadata = [
      ["Report", reportTitle ?? fileName],
      ["Generated At", generatedAt ?? new Date().toISOString()],
      ...Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    ];
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${metadata.map(([key, value]) => `<tr><th>${escape(key)}</th><td>${escape(value)}</td></tr>`).join("")}</table><br/><table border="1"><thead><tr>${headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escape(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={handleExport}
        title="Export CSV"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.1)",
          color: "#ffffff",
          padding: "10px 14px",
          cursor: "pointer",
        }}
      >
        <Download size={16} />
        <span>Export CSV</span>
      </button>
      <button
        type="button"
        onClick={handleExcelExport}
        title="Export Excel"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.1)", color: "#fff", padding: "10px 14px", cursor: "pointer" }}
      >
        <FileSpreadsheet size={16} />
        <span>Export Excel</span>
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        title="Print or save as PDF"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.1)",
          color: "#ffffff",
          padding: "10px 14px",
          cursor: "pointer",
        }}
      >
        <Printer size={16} />
        <span>Print / PDF</span>
      </button>
    </div>
  );
}
