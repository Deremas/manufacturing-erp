"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, Pencil, Power } from "lucide-react";

import { ActionButtons, EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import { PRICE_CHANNEL_OPTIONS } from "@/lib/pricing/channels";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import { publicEditUrl, publicViewUrl, publicViewUrlFromPayload } from "@/lib/routing/urls";
import type { Location, PriceList } from "../types";

export interface PriceListsListPageProps {
  initialData: PriceList[];
  locations: Location[];
  currencyCode: string;
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  padding: "24px",
  background: "#f8fafc",
};

const metricRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const filterCardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "18px",
  border: `1px solid ${colors.border}`,
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "46px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: "12px",
  padding: "10px 14px",
  background: "#fff",
  boxSizing: "border-box",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  background: "#fff",
  borderRadius: "18px",
  border: `1px solid ${colors.border}`,
};

const tableStyle: React.CSSProperties = {
  minWidth: "1100px",
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 12px",
  background: colors.secondary[50],
  color: colors.text.secondary,
  borderBottom: `1px solid ${colors.border}`,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.semibold,
};

const tdStyle: React.CSSProperties = {
  padding: "14px 12px",
  borderBottom: `1px solid ${colors.border}`,
};

const actionWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
};

const actionIconButtonStyle: React.CSSProperties = {
  width: "38px",
  height: "38px",
  borderRadius: "12px",
  border: `1px solid ${colors.border}`,
  background: "#fff",
  color: colors.text.secondary,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

export default function PriceListsListPage({
  initialData,
  locations,
  currencyCode,
}: PriceListsListPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [defaultOnly, setDefaultOnly] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [actionError, setActionError] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Price Lists" },
  ];

  const actions: Action[] = [
    {
      label: "Create Price List",
      variant: "primary",
      onClick: () => router.push("/master-data/price-lists/create"),
    },
  ];

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return initialData.filter((priceList) => {
      if (channel && priceList.channel !== channel) return false;
      if (status && String(priceList.isActive) !== status) return false;
      if (defaultOnly && !priceList.isDefault) return false;
      if (locationId && priceList.locationId !== locationId) return false;
      if (!normalizedSearch) return true;

      return [
        priceList.code,
        priceList.name,
        priceList.channel,
        priceList.customerGroup,
        priceList.locationName,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        );
    });
  }, [channel, defaultOnly, initialData, locationId, search, status]);

  const now = new Date();
  const expiredCount = initialData.filter(
    (priceList) => priceList.effectiveTo && new Date(priceList.effectiveTo) < now,
  ).length;

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Price Lists"
        subtitle="Manage channel-based finished goods selling prices"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      <div style={metricRowStyle}>
        <MetricCard label="Total Price Lists" value={initialData.length} />
        <MetricCard label="Active Price Lists" value={initialData.filter((item) => item.isActive).length} />
        <MetricCard label="Default Price Lists" value={initialData.filter((item) => item.isDefault).length} />
        <MetricCard label="Expired Price Lists" value={expiredCount} />
      </div>

      <div style={filterCardStyle}>
        <div style={{ fontWeight: typography.weights.semibold }}>Filter Price Lists</div>
        <div style={filterGridStyle}>
          <input
            style={inputStyle}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search code or name"
          />
          <select style={inputStyle} value={channel} onChange={(event) => setChannel(event.target.value)}>
            <option value="">All channels</option>
            {PRICE_CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select style={inputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select style={inputStyle} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.locationCode} - {location.locationName}
              </option>
            ))}
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            checked={defaultOnly}
            onChange={(event) => setDefaultOnly(event.target.checked)}
          />
          <span>Default lists only</span>
        </label>
      </div>

      {actionError ? (
        <div
          style={{
            borderRadius: "14px",
            border: `1px solid ${colors.danger[200]}`,
            background: colors.danger[50],
            color: colors.danger[700],
            padding: "12px 14px",
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: typography.weights.semibold,
          }}
        >
          {actionError}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No Price Lists Found"
          message="Create a finished goods price list to start applying prices by channel."
          action={{ label: "Create Price List", onClick: () => router.push("/master-data/price-lists/create") }}
        />
      ) : (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Channel</th>
                <th style={thStyle}>Currency</th>
                <th style={thStyle}>Effective From</th>
                <th style={thStyle}>Effective To</th>
                <th style={thStyle}>Items Count</th>
                <th style={thStyle}>Default</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((priceList) => (
                <tr key={priceList.id}>
                  <td style={tdStyle}>{priceList.code}</td>
                  <td style={tdStyle}>{priceList.name}</td>
                  <td style={tdStyle}>{priceList.channel}</td>
                  <td style={tdStyle}>{priceList.currency ?? currencyCode}</td>
                  <td style={tdStyle}>{priceList.effectiveFrom ? formatDate(priceList.effectiveFrom, "short") : "—"}</td>
                  <td style={tdStyle}>{priceList.effectiveTo ? formatDate(priceList.effectiveTo, "short") : "Open ended"}</td>
                  <td style={tdStyle}>{priceList.itemsCount ?? 0}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={priceList.isDefault ? "posted" : "draft"} />
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge status={priceList.isActive ? "active" : "inactive"} />
                  </td>
                  <td style={tdStyle}>
                    <div style={actionWrapStyle}>
                      <button
                        type="button"
                        style={actionIconButtonStyle}
                        title="View price list"
                        aria-label={`View ${priceList.code}`}
                        onClick={() => router.push(publicViewUrl("master-data.price-list", priceList.publicId))}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        style={actionIconButtonStyle}
                        title="Edit price list"
                        aria-label={`Edit ${priceList.code}`}
                        onClick={() => router.push(publicEditUrl("master-data.price-list", priceList.publicId))}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        style={actionIconButtonStyle}
                        title="Duplicate price list"
                        aria-label={`Duplicate ${priceList.code}`}
                        onClick={async () => {
                          setActionError("");
                          const response = await fetch(`/api/master-data/price-lists/${priceList.id}/duplicate`, { method: "POST" });
                          const payload = (await response.json()) as {
                            item?: { id: string; publicId?: number };
                            error?: string;
                          };
                          if (!response.ok || !(payload.item?.publicId ?? payload.item?.id)) {
                            setActionError(payload.error ?? "Failed to duplicate price list");
                            return;
                          }
                          router.push(
                            publicViewUrlFromPayload(
                              "master-data.price-list",
                              payload,
                              `/master-data/price-lists/${payload.item?.id ?? ""}`,
                            ),
                          );
                        }}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        style={{
                          ...actionIconButtonStyle,
                          color: colors.danger[700],
                          borderColor: colors.danger[200],
                          background: colors.danger[50],
                        }}
                        title="Deactivate price list"
                        aria-label={`Deactivate ${priceList.code}`}
                        disabled={!priceList.isActive}
                        onClick={async () => {
                          setActionError("");
                          const response = await fetch(`/api/master-data/price-lists/${priceList.id}`, { method: "DELETE" });
                          if (!response.ok) {
                            const payload = (await response.json()) as { error?: string };
                            setActionError(payload.error ?? "Failed to deactivate price list");
                            return;
                          }
                          router.refresh();
                        }}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
