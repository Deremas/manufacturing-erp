import { getCurrentUser } from "@/lib/auth/auth";
import { QCDashboardPage } from "@/features/qc/components/QCDashboard";
import { getQcDashboard } from "@/services/qc/qc-dashboard.service";

export const dynamic = "force-dynamic";

export default async function QCRoutePage() {
  const user = await getCurrentUser();
  const data = await getQcDashboard({ accessibleLocationIds: user?.accessibleLocationIds });
  return (
    <QCDashboardPage
      kpis={data.kpis}
      formCounts={data.formCounts}
      openNonconformities={data.openNonconformities}
      activeHolds={data.activeHolds}
      pendingApprovals={data.pendingApprovals}
      recentFailed={data.recentFailed}
    />
  );
}
