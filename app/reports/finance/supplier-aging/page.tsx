import { AccountsPayableAgingPage } from "@/features/procurement/finance-report-pages";
import { getAccountsPayableAgingReport } from "@/services/procurement/accounts-payable-report.service";

export default async function SupplierAgingReportPage() {
  const rows = await getAccountsPayableAgingReport();
  return <AccountsPayableAgingPage rows={rows} />;
}
