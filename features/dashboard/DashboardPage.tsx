"use client";

import React, { useEffect, useState } from "react";
import { spacing } from "@/components/ui/spacing";
import { colors } from "@/components/ui/colors";
import {
  HeroBanner,
  MetricCard,
  DataTable,
  EmptyState,
} from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import {
  getDashboardMetrics,
  getRecentActivities,
  getPendingApprovals,
} from "@/services/dashboard/dashboard.service";
import type { DashboardMetrics } from "@/services/dashboard/dashboard.service";

interface Activity {
  id: string;
  action: string;
  module: string;
  timestamp: string;
  user: string;
}

const activityColumns: Column<Activity>[] = [
  { key: "action", label: "Action" },
  { key: "module", label: "Module" },
  { key: "user", label: "User" },
  { key: "timestamp", label: "Timestamp" },
];

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontSize: "18px",
  fontWeight: 600,
  color: colors.text.primary,
  margin: 0,
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacing.card.gap,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const metricGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: spacing.card.gap,
};

const DashboardIcon = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const PackageIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const UsersIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ShoppingCartIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const AlertTriangleIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ClockIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckCircleIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsData, activitiesData, approvalsData] = await Promise.all([
          getDashboardMetrics(),
          getRecentActivities(),
          getPendingApprovals(),
        ]);
        setMetrics(metricsData);
        setActivities(activitiesData as Activity[]);
        setPendingApprovals(approvalsData);
      } catch {
        // Keep empty state if data cannot be loaded.
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const allZero =
    metrics &&
    metrics.totalItems === 0 &&
    metrics.activeSuppliers === 0 &&
    metrics.openPOs === 0 &&
    metrics.lowStockItems === 0 &&
    metrics.pendingApprovals === 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing.page.gap,
      }}
    >
      <HeroBanner
        title="Dashboard"
        subtitle="Overview of your manufacturing operations"
        icon={DashboardIcon}
      />

      {loading ? (
        <EmptyState title="Loading dashboard" message="Fetching current metrics..." />
      ) : allZero ? (
        <EmptyState
          icon={CheckCircleIcon}
          title="No data yet"
          message="Your dashboard metrics will appear here once data is available. Start by adding items, suppliers, or purchase orders."
        />
      ) : (
        <div style={metricGridStyle}>
          <MetricCard
            label="Total Items"
            value={metrics?.totalItems ?? 0}
            icon={PackageIcon}
            borderColor={colors.primary[500]}
          />
          <MetricCard
            label="Active Suppliers"
            value={metrics?.activeSuppliers ?? 0}
            icon={UsersIcon}
            borderColor={colors.success[500]}
          />
          <MetricCard
            label="Open Purchase Orders"
            value={metrics?.openPOs ?? 0}
            icon={ShoppingCartIcon}
            borderColor={colors.warning[500]}
          />
          <MetricCard
            label="Low Stock Items"
            value={metrics?.lowStockItems ?? 0}
            icon={AlertTriangleIcon}
            borderColor={colors.danger[500]}
          />
          <MetricCard
            label="Pending Approvals"
            value={metrics?.pendingApprovals ?? 0}
            icon={ClockIcon}
            borderColor={colors.secondary[500]}
          />
        </div>
      )}

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={sectionTitleStyle}>Recent Activities</h3>
        </div>
        <DataTable
          columns={activityColumns}
          data={activities}
          emptyState={
            <EmptyState
              title="No recent activities"
              message="Recent actions across the system will appear here."
            />
          }
        />
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={sectionTitleStyle}>Pending Approvals</h3>
        </div>
        {pendingApprovals.length === 0 ? (
          <EmptyState
            title="No pending approvals"
            message="All approvals are up to date."
          />
        ) : (
          <DataTable
            columns={[
              { key: "type", label: "Type" },
              { key: "reference", label: "Reference" },
              { key: "requestedBy", label: "Requested By" },
              { key: "date", label: "Date" },
            ]}
            data={pendingApprovals}
            emptyState={
              <EmptyState
                title="No pending approvals"
                message="All approvals are up to date."
              />
            }
          />
        )}
      </div>
    </div>
  );
}
