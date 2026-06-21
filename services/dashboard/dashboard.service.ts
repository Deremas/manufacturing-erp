// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardMetrics {
  totalItems: number;
  activeSuppliers: number;
  openPOs: number;
  lowStockItems: number;
  pendingApprovals: number;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  // TODO: Query DB via Prisma — return real counts from database
  return {
    totalItems: 0,
    activeSuppliers: 0,
    openPOs: 0,
    lowStockItems: 0,
    pendingApprovals: 0,
  };
}

export async function getRecentActivities(): Promise<any[]> {
  // TODO: Query DB via Prisma — return recent audit log entries
  return [];
}

export async function getPendingApprovals(): Promise<any[]> {
  // TODO: Query DB via Prisma — return records with pending approval status
  return [];
}
