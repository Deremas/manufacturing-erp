import { requireAuth } from "@/lib/auth/auth";
import PayrollRunCreatePage from "@/features/hr/PayrollRunCreatePage";
import { getPayrollRunReferenceData } from "@/services/hr/payroll.service";

export default async function HrPayrollCreateRoute() {
  const user = await requireAuth();
  const referenceData = await getPayrollRunReferenceData({
    accessibleLocationIds: user.accessibleLocationIds,
  });

  return (
    <PayrollRunCreatePage
      nextPayrollNo={referenceData.nextPayrollNo}
      locations={referenceData.locations}
    />
  );
}
