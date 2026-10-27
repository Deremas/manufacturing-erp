import { AccountsPayableAgingPage } from "@/features/procurement/finance-report-pages";
import { getAccountsPayableAgingReport } from "@/services/procurement/accounts-payable-report.service";

export const dynamic = "force-dynamic";

export default async function AgingReportsPage() {
  const rows = await getAccountsPayableAgingReport();
  return <AccountsPayableAgingPage rows={rows} />;
}
