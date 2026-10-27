import { requireAuth } from "@/lib/auth/auth";
import PayrollSettingsPage from "@/features/hr/PayrollSettingsPage";
import { getPayrollSettingsReferenceData } from "@/services/hr/payroll.service";

export default async function HrPayrollSettingsRoute() {
  await requireAuth();
  const { settings, accounts } = await getPayrollSettingsReferenceData();

  return <PayrollSettingsPage settings={settings} accounts={accounts} />;
}
