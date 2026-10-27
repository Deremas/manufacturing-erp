import { QCWaterLanding } from "@/features/qc/components/QCWaterLanding";
import { getCurrentUser } from "@/lib/auth/auth";
import { get as getCompanySettings } from "@/services/administration/companySettingsService";
import { getQcDashboard } from "@/services/qc/qc-dashboard.service";
import { listQcTests } from "@/services/qc/qc.service";

export const dynamic = "force-dynamic";

export default async function WaterHubPage() {
  const user = await getCurrentUser();
  const [rows, dashboard, company] = await Promise.all([
    listQcTests("water-test"),
    getQcDashboard({ accessibleLocationIds: user?.accessibleLocationIds }),
    getCompanySettings(),
  ]);

  return (
    <QCWaterLanding
      companyName={company.data?.companyName}
      productionCount={rows.length}
      kpis={dashboard.kpis}
      openNonconformities={dashboard.openNonconformities}
      activeHolds={dashboard.activeHolds}
    />
  );
}
