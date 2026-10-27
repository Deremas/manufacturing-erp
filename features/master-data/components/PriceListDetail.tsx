"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { ActionButtons, EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import { publicEditUrl, publicViewUrl, publicViewUrlFromPayload } from "@/lib/routing/urls";
import type { PriceList, PriceListUsageRecord } from "@/features/master-data/types";

export interface PriceListDetailProps {
  priceList: PriceList;
  usage: PriceListUsageRecord[];
  currencyCode: string;
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  padding: "24px",
  background: "#f8fafc",
};

const heroStyle: React.CSSProperties = {
  borderRadius: "18px",
  padding: "24px",
  background: "linear-gradient(135deg, #00897b 0%, #26a69a 100%)",
  color: "#fff",
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: typography.sizes.h2.fontSize,
  fontWeight: typography.weights.bold,
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
};

const labelStyle: React.CSSProperties = {
  fontSize: typography.sizes.caption.fontSize,
  color: colors.text.secondary,
  fontWeight: typography.weights.medium,
  letterSpacing: "0.04em",
};

const valueStyle: React.CSSProperties = {
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  minWidth: "860px",
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  background: colors.secondary[50],
  color: colors.text.secondary,
  borderBottom: `1px solid ${colors.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: `1px solid ${colors.border}`,
};

export default function PriceListDetail({
  priceList,
  usage,
  currencyCode,
}: PriceListDetailProps) {
  const router = useRouter();

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Price Lists", href: "/master-data/price-lists" },
    { label: priceList.code ?? "Detail" },
  ];

  const actions: Action[] = [
    {
      label: "Back",
      variant: "secondary",
      onClick: () => router.push("/master-data/price-lists"),
    },
    {
      label: "Edit",
      variant: "primary",
      onClick: () => router.push(publicEditUrl("master-data.price-list", priceList.publicId)),
    },
    {
      label: "Duplicate",
      variant: "secondary",
      onClick: async () => {
        const response = await fetch(`/api/master-data/price-lists/${priceList.id}/duplicate`, {
          method: "POST",
        });
        const payload = (await response.json()) as {
          item?: { id: string; publicId?: number };
          error?: string;
        };
        if (!response.ok || !(payload.item?.publicId ?? payload.item?.id)) {
          alert(payload.error ?? "Failed to duplicate price list");
          return;
        }
        router.push(
          publicViewUrlFromPayload(
            "master-data.price-list",
            payload,
            `/master-data/price-lists/${payload.item?.id ?? ""}`,
          ),
        );
      },
    },
    {
      label: priceList.isActive ? "Deactivate" : "Inactive",
      variant: "danger",
      disabled: !priceList.isActive,
      onClick: async () => {
        const response = await fetch(`/api/master-data/price-lists/${priceList.id}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          alert(payload.error ?? "Failed to deactivate price list");
          return;
        }
        router.refresh();
      },
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        recordKind="md.price-list"
        title={priceList.name ?? priceList.code ?? "Price List"}
        subtitle="Review header details, finished goods pricing rows, and usage"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      <div style={heroStyle}>
        <div>
          <div style={{ opacity: 0.85, marginBottom: "6px" }}>{priceList.code}</div>
          <h2 style={heroTitleStyle}>{priceList.name}</h2>
          <div style={{ opacity: 0.9, marginTop: "8px" }}>
            {priceList.channel} · {priceList.currency ?? currencyCode}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <StatusBadge status={priceList.isActive ? "active" : "inactive"} />
          <StatusBadge status={priceList.isDefault ? "posted" : "draft"} />
        </div>
      </div>

      <FormCard title="Header Information" variant="teal-header">
        <div style={metaGridStyle}>
          <div>
            <div style={labelStyle}>Channel</div>
            <div style={valueStyle}>{priceList.channel}</div>
          </div>
          <div>
            <div style={labelStyle}>Currency</div>
            <div style={valueStyle}>{priceList.currency ?? currencyCode}</div>
          </div>
          <div>
            <div style={labelStyle}>Location</div>
            <div style={valueStyle}>{priceList.locationName ?? "All eligible locations"}</div>
          </div>
          <div>
            <div style={labelStyle}>Customer Group</div>
            <div style={valueStyle}>{priceList.customerGroup ?? "All groups"}</div>
          </div>
          <div>
            <div style={labelStyle}>Customer / Agent</div>
            <div style={valueStyle}>{priceList.customerName ?? "All customers / agents"}</div>
          </div>
          <div>
            <div style={labelStyle}>Effective Period</div>
            <div style={valueStyle}>
              {priceList.effectiveFrom ? formatDate(priceList.effectiveFrom, "short") : "—"}
              {" to "}
              {priceList.effectiveTo ? formatDate(priceList.effectiveTo, "short") : "Open ended"}
            </div>
          </div>
        </div>

        {priceList.description ? (
          <div style={{ marginTop: "18px" }}>
            <div style={labelStyle}>Description</div>
            <div style={valueStyle}>{priceList.description}</div>
          </div>
        ) : null}
      </FormCard>

      <FormCard title="Price Items" variant="teal-header">
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Item Code</th>
                <th style={thStyle}>Item Name</th>
                <th style={thStyle}>UOM</th>
                <th style={thStyle}>Unit Price</th>
                <th style={thStyle}>Minimum Qty</th>
                <th style={thStyle}>Tax Included</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(priceList.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.itemCode ?? "—"}</td>
                  <td style={tdStyle}>{item.itemName ?? "—"}</td>
                  <td style={tdStyle}>
                    {item.uomCode ? `${item.uomCode} - ` : ""}
                    {item.uomName ?? "—"}
                  </td>
                  <td style={tdStyle}>{formatCurrency(item.unitPrice ?? 0, priceList.currency ?? currencyCode)}</td>
                  <td style={tdStyle}>{item.minimumQty}</td>
                  <td style={tdStyle}>{item.taxIncluded ? "Yes" : "No"}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={item.isActive ? "active" : "inactive"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>

      <FormCard title="Usage" variant="teal-header">
        {usage.length === 0 ? (
          <EmptyState
            title="This price list has not been used yet."
            message="Once real sales or loading transactions save a price snapshot from this list, they will appear here."
          />
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Document Type</th>
                  <th style={thStyle}>Document No</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Customer / Agent / Location</th>
                  <th style={thStyle}>Total Quantity</th>
                  <th style={thStyle}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row) => (
                  <tr key={`${row.documentType}-${row.documentNo}-${row.date}`}>
                    <td style={tdStyle}>{row.documentType}</td>
                    <td style={tdStyle}>{row.documentNo}</td>
                    <td style={tdStyle}>{formatDate(row.date, "short")}</td>
                    <td style={tdStyle}>{row.counterparty ?? "—"}</td>
                    <td style={tdStyle}>{row.totalQuantity}</td>
                    <td style={tdStyle}>{formatCurrency(row.totalValue, priceList.currency ?? currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  );
}
