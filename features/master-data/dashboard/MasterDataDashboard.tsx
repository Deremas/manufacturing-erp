"use client";

import React, { useState } from "react";
import { HeroBanner, MetricCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import {
  Package,
  Users,
  Truck,
  FolderTree,
  Ruler,
  PlusCircle,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface DataQualityItem {
  label: string;
  count: number;
  color: string;
}

interface RecentActivityItem {
  name: string;
  type: string;
  date: string;
}

export interface MasterDataDashboardProps {
  metrics?: {
    totalItems: number;
    totalCustomers: number;
    totalSuppliers: number;
    totalCategories: number;
    totalUnits: number;
  };
  dataQuality?: DataQualityItem[];
  recentAdded?: RecentActivityItem[];
  recentUpdated?: RecentActivityItem[];
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const metricsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
  gap: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h6.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
  padding: "24px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "12px",
};

const quickActionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px 16px",
  backgroundColor: "#f9fafb",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.scale.md,
  cursor: "pointer",
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.primary,
  textDecoration: "none",
  transition: "background-color 0.15s",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 80px",
  padding: "10px 12px",
  backgroundColor: "#fafafa",
  borderBottom: `1px solid ${colors.border}`,
  fontFamily: typography.fontFamily,
  fontSize: "12px",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
};

const tableRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 80px",
  padding: "10px 12px",
  borderBottom: `1px solid ${colors.border}`,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  color: colors.text.primary,
  alignItems: "center",
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function MasterDataDashboard({
  metrics = {
    totalItems: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalCategories: 0,
    totalUnits: 0,
  },
  dataQuality = [],
  recentAdded = [],
  recentUpdated = [],
}: MasterDataDashboardProps) {

  const handleCreate = (entity: string) => console.log("Create", entity);

  const quickActions = [
    {
      label: "Create Item",
      icon: <Package size={18} />,
      onClick: () => handleCreate("Item"),
    },
    {
      label: "Create Customer",
      icon: <Users size={18} />,
      onClick: () => handleCreate("Customer"),
    },
    {
      label: "Create Supplier",
      icon: <Truck size={18} />,
      onClick: () => handleCreate("Supplier"),
    },
    {
      label: "Create Category",
      icon: <FolderTree size={18} />,
      onClick: () => handleCreate("Category"),
    },
    {
      label: "Create Unit",
      icon: <Ruler size={18} />,
      onClick: () => handleCreate("Unit"),
    },
  ];

  return (
    <div style={pageStyle}>
      <HeroBanner
        title="Master Data"
        subtitle="Manage reusable business definitions used across the ERP."
        icon={<Package size={24} />}
      />

      <div style={metricsRowStyle}>
        <MetricCard
          label="Total Items"
          value={metrics.totalItems}
          icon={<Package size={20} />}
          color={colors.primary[600]}
          borderColor={colors.primary[500]}
        />
        <MetricCard
          label="Total Customers"
          value={metrics.totalCustomers}
          icon={<Users size={20} />}
          color={colors.success[600]}
          borderColor={colors.success[500]}
        />
        <MetricCard
          label="Total Suppliers"
          value={metrics.totalSuppliers}
          icon={<Truck size={20} />}
          color={colors.warning[600]}
          borderColor={colors.warning[500]}
        />
        <MetricCard
          label="Total Categories"
          value={metrics.totalCategories}
          icon={<FolderTree size={20} />}
          color={colors.secondary[600]}
          borderColor={colors.secondary[500]}
        />
        <MetricCard
          label="Total Units"
          value={metrics.totalUnits}
          icon={<Ruler size={20} />}
          color="#0891b2"
          borderColor="#06b6d4"
        />
      </div>

      <div style={cardStyle}>
        <h3 style={{ ...sectionTitleStyle, marginBottom: "16px" }}>
          Quick Actions
        </h3>
        <div style={gridStyle}>
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              style={quickActionStyle}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <AlertTriangle size={18} color={colors.warning[600]} />
            <h3 style={sectionTitleStyle}>Data Quality</h3>
          </div>
          {dataQuality.length === 0 ? (
            <div
              style={{
                padding: "24px 0",
                textAlign: "center",
                color: colors.text.muted,
                fontSize: typography.sizes.small.fontSize,
              }}
            >
              No data quality issues found.
            </div>
          ) : (
            <>
              <div style={tableHeaderStyle}>
                <span>Issue</span>
                <span style={{ textAlign: "right" }}>Count</span>
              </div>
              {dataQuality.map((item, i) => (
                <div key={i} style={tableRowStyle}>
                  <span>{item.label}</span>
                  <span
                    style={{
                      textAlign: "right",
                      fontWeight: typography.weights.semibold,
                      color: item.color,
                    }}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <Activity size={18} color={colors.primary[600]} />
            <h3 style={sectionTitleStyle}>Recent Activity</h3>
          </div>

          <h4
            style={{
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.small.fontSize,
              fontWeight: typography.weights.semibold,
              color: colors.text.secondary,
              margin: "0 0 8px 0",
            }}
          >
            Recently Added
          </h4>
          {recentAdded.length === 0 ? (
            <div
              style={{
                padding: "8px 0",
                color: colors.text.muted,
                fontSize: typography.sizes.caption.fontSize,
              }}
            >
              No recently added items.
            </div>
          ) : (
            <>
              <div style={tableHeaderStyle}>
                <span>Name</span>
                <span style={{ textAlign: "right" }}>Date</span>
              </div>
              {recentAdded.map((item, i) => (
                <div key={i} style={tableRowStyle}>
                  <span>{item.name}</span>
                  <span
                    style={{ textAlign: "right", color: colors.text.muted }}
                  >
                    {item.date}
                  </span>
                </div>
              ))}
            </>
          )}

          <h4
            style={{
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.small.fontSize,
              fontWeight: typography.weights.semibold,
              color: colors.text.secondary,
              margin: "12px 0 8px 0",
            }}
          >
            Recently Updated
          </h4>
          {recentUpdated.length === 0 ? (
            <div
              style={{
                padding: "8px 0",
                color: colors.text.muted,
                fontSize: typography.sizes.caption.fontSize,
              }}
            >
              No recently updated items.
            </div>
          ) : (
            <>
              <div style={tableHeaderStyle}>
                <span>Name</span>
                <span style={{ textAlign: "right" }}>Date</span>
              </div>
              {recentUpdated.map((item, i) => (
                <div key={i} style={tableRowStyle}>
                  <span>{item.name}</span>
                  <span
                    style={{ textAlign: "right", color: colors.text.muted }}
                  >
                    {item.date}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
