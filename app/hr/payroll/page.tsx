import { requireAuth } from "@/lib/auth/auth";
import PayrollRunsListPage from "@/features/hr/PayrollRunsListPage";
import { listPayrollRuns } from "@/services/hr/payroll.service";

export const dynamic = "force-dynamic";

export default async function HrPayrollRoute() {
  const user = await requireAuth();
  const rows = await listPayrollRuns({
    accessibleLocationIds: user.accessibleLocationIds,
  });

  return <PayrollRunsListPage rows={rows} />;
}
