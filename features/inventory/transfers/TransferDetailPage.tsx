"use client";

import React, { useState } from "react";
import {
  PageHeader,
  StatusBadge,
  ActionButtons,
  FormCard,
} from "@/components/shared";
import type { Action } from "@/components/shared";
import {
  TransactionLayout,
  DocumentTimeline,
  DocumentComments,
  DocumentAttachments,
  TransactionActions,
} from "@/components/transactions";
import type {
  DocumentStatus,
  DocumentHistoryEntry,
} from "@/services/transactions/types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";

const history: DocumentHistoryEntry[] = [];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function TransferDetailPage() {
  const [status] = useState<DocumentStatus>("APPROVED");

  const handleAction = (action: string) => {
    console.log("Action:", action);
  };

  const pageActions: Action[] = [
    {
      label: "Back to Transfers",
      variant: "secondary",
      onClick: () => console.log("Navigate back"),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Stock Transfer Detail"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory" },
          { label: "Stock Transfers", href: "/inventory/transfers" },
          { label: "TRF-2026-0001" },
        ]}
        actions={<ActionButtons actions={pageActions} />}
      />

      <TransactionLayout
        title="Stock Transfer"
        documentNumber="TRF-2026-0001"
        subtitle="Transfer between locations"
        status={status}
        onAction={handleAction}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${spacing.page.gap}px`,
          }}
        >
          {/* Transfer Details Card */}
          <FormCard title="Transfer Details">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.text.secondary,
                    fontWeight: 500,
                  }}
                >
                  From Location
                </div>
                <div
                  style={{
                    fontSize: typography.sizes.body.fontSize,
                    fontWeight: 600,
                    color: colors.text.primary,
                    marginTop: "4px",
                  }}
                >
                  Main Warehouse
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.text.secondary,
                    fontWeight: 500,
                  }}
                >
                  To Location
                </div>
                <div
                  style={{
                    fontSize: typography.sizes.body.fontSize,
                    fontWeight: 600,
                    color: colors.text.primary,
                    marginTop: "4px",
                  }}
                >
                  Store B
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.text.secondary,
                    fontWeight: 500,
                  }}
                >
                  Date
                </div>
                <div
                  style={{
                    fontSize: typography.sizes.body.fontSize,
                    fontWeight: 600,
                    color: colors.text.primary,
                    marginTop: "4px",
                  }}
                >
                  Jun 17, 2026
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.text.secondary,
                    fontWeight: 500,
                  }}
                >
                  Created By
                </div>
                <div
                  style={{
                    fontSize: typography.sizes.body.fontSize,
                    fontWeight: 600,
                    color: colors.text.primary,
                    marginTop: "4px",
                  }}
                >
                  John Kamau
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.text.secondary,
                    fontWeight: 500,
                  }}
                >
                  Status
                </div>
                <div style={{ marginTop: "4px" }}>
                  <StatusBadge status="active" />
                </div>
              </div>
            </div>
          </FormCard>

          {/* Line Items Table */}
          <FormCard title="Transfer Items">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.body.fontSize,
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f9fafb" }}>
                  {[
                    "Item Code",
                    "Item Name",
                    "Quantity",
                    "Unit Cost",
                    "Total",
                    "Notes",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontWeight: typography.weights.semibold,
                        fontSize: typography.sizes.small.fontSize,
                        color: colors.text.secondary,
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    code: "PREF-001",
                    name: "Preform 28mm Clear",
                    qty: 2000,
                    cost: 8.5,
                  },
                  {
                    code: "CAP-001",
                    name: "Screw Cap 28mm White",
                    qty: 5000,
                    cost: 2.0,
                  },
                  {
                    code: "LAB-001",
                    name: "Label 500ml",
                    qty: 10000,
                    cost: 0.75,
                  },
                ].map((item, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        padding: "10px 14px",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      {item.code}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      {item.name}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      {item.qty.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      KSh {item.cost.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      KSh{" "}
                      {(item.qty * item.cost).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      —
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormCard>

          {/* Timeline, Comments, Attachments */}
          <FormCard title="Document Timeline">
            <DocumentTimeline history={history} />
          </FormCard>

          <FormCard title="Comments">
            <DocumentComments
              referenceType="TRANSFER"
              referenceId="trf-1"
              currentUserId="user-1"
            />
          </FormCard>

          <FormCard title="Attachments">
            <DocumentAttachments
              referenceType="TRANSFER"
              referenceId="trf-1"
              currentUserId="user-1"
            />
          </FormCard>
        </div>
      </TransactionLayout>
    </div>
  );
}
