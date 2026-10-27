"use client";

import type { ReactNode } from "react";

import { PageHeader } from "@/components/shared";

export default function ReportHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  refreshedAt,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  refreshedAt?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        borderRadius: "18px",
        padding: "24px 28px",
        background: "linear-gradient(135deg, #0f766e 0%, #0f9f95 100%)",
        color: "#ffffff",
      }}
    >
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />
      {refreshedAt ? (
        <div style={{ fontSize: 13, opacity: 0.88 }}>
          Last refreshed: {refreshedAt}
        </div>
      ) : null}
    </div>
  );
}
