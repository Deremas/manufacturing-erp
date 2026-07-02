import { sql } from "@/lib/db";
import { getPendingApprovals as getDbPendingApprovals } from "@/services/approval/approvalService";

export interface DashboardMetrics {
  totalItems: number;
  activeSuppliers: number;
  openPOs: number;
  lowStockItems: number;
  pendingApprovals: number;
}

export interface DashboardActivity {
  id: string;
  action: string;
  module: string;
  timestamp: string;
  user: string;
}

export interface DashboardPendingApproval {
  id: string;
  type: string;
  reference: string;
  requestedBy: string;
  date: string;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const [items, suppliers, lowStock, approvals] = await Promise.all([
      sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "Item"
        WHERE "isArchived" = false
      `,
      sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "Supplier"
        WHERE "isArchived" = false AND "isActive" = true
      `,
      sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "StockBalance" sb
        INNER JOIN "Item" i ON i.id = sb."itemId"
        WHERE sb."availableQuantity" <= COALESCE(i."reorderPoint", 0)
      `,
      sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "Approval"
        WHERE status = 'PENDING' AND "isArchived" = false
      `,
    ]);

    return {
      totalItems: Number(items[0]?.count ?? 0),
      activeSuppliers: Number(suppliers[0]?.count ?? 0),
      openPOs: 0,
      lowStockItems: Number(lowStock[0]?.count ?? 0),
      pendingApprovals: Number(approvals[0]?.count ?? 0),
    };
  } catch {
    return {
      totalItems: 0,
      activeSuppliers: 0,
      openPOs: 0,
      lowStockItems: 0,
      pendingApprovals: 0,
    };
  }
}

export async function getRecentActivities(): Promise<DashboardActivity[]> {
  try {
    const rows = await sql<Array<DashboardActivity>>`
      SELECT
        al.id,
        al.action,
        al.module,
        al.timestamp::text AS timestamp,
        COALESCE(u.name, al."userId") AS "user"
      FROM "AuditLog" al
      LEFT JOIN "User" u ON u.id = al."userId"
      WHERE al."isArchived" = false
      ORDER BY al.timestamp DESC
      LIMIT 10
    `;

    return rows;
  } catch {
    return [];
  }
}

export async function getPendingApprovals(userId?: string): Promise<DashboardPendingApproval[]> {
  try {
    const approvals = await getDbPendingApprovals(userId);
    return approvals.map((approval) => ({
      id: approval.id,
      type: approval.referenceType,
      reference: approval.referenceId,
      requestedBy: approval.requestedByName,
      date: new Intl.DateTimeFormat("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(approval.createdAt)),
    }));
  } catch {
    return [];
  }
}
