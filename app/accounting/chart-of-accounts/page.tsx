import { ChartOfAccountsLivePage } from "@/features/accounting/accounting-pages";
import { listAccounts } from "@/services/accounting/accounting.service";

export default async function ChartOfAccountsPage() {
  const rows = await listAccounts();
  return <ChartOfAccountsLivePage rows={rows} />;
}
