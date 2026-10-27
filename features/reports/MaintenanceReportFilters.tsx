"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ReportFilters } from "@/components/reporting";
import { colors } from "@/components/ui/colors";

type Option = { value: string; label: string };

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: colors.text.secondary };
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  backgroundColor: colors.surface,
  boxSizing: "border-box",
};

export default function MaintenanceReportFilters({
  assets,
  locations,
  statusOptions = [],
  showAsset = true,
}: {
  assets: Option[];
  locations: Option[];
  statusOptions?: Option[];
  showAsset?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [locationId, setLocationId] = useState(searchParams.get("locationId") ?? "");
  const [assetId, setAssetId] = useState(searchParams.get("assetId") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");

  const dedupedStatusOptions = useMemo(
    () => statusOptions.filter((option, index, all) => all.findIndex((entry) => entry.value === option.value) === index),
    [statusOptions],
  );

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    const next = { dateFrom, dateTo, locationId, assetId, status };

    Object.entries(next).forEach(([key, value]) => {
      if (value.trim()) {
        params.set(key, value.trim());
      } else {
        params.delete(key);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  }

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setLocationId("");
    setAssetId("");
    setStatus("");
    router.push(pathname);
  }

  return (
    <ReportFilters title="Maintenance Filters">
      <label style={fieldStyle}>
        <span style={labelStyle}>Date From</span>
        <input type="date" style={inputStyle} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
      </label>
      <label style={fieldStyle}>
        <span style={labelStyle}>Date To</span>
        <input type="date" style={inputStyle} value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </label>
      <label style={fieldStyle}>
        <span style={labelStyle}>Location</span>
        <select style={inputStyle} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
          <option value="">All locations</option>
          {locations.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {showAsset ? (
        <label style={fieldStyle}>
          <span style={labelStyle}>Asset</span>
          <select style={inputStyle} value={assetId} onChange={(event) => setAssetId(event.target.value)}>
            <option value="">All assets</option>
            {assets.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label style={fieldStyle}>
        <span style={labelStyle}>Status</span>
        <select style={inputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {dedupedStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={applyFilters}
          style={{
            height: 42,
            borderRadius: 12,
            border: `1px solid ${colors.primary[400]}`,
            backgroundColor: colors.primary[600],
            color: "#fff",
            padding: "0 16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={resetFilters}
          style={{
            height: 42,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.text.primary,
            padding: "0 16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </ReportFilters>
  );
}
