import { TrialBalanceLivePage } from "@/features/accounting/accounting-pages";
import { getTrialBalanceRows } from "@/services/accounting/accounting.service";

export default async function TrialBalancePage() {
  const rows = await getTrialBalanceRows();
  return <TrialBalanceLivePage rows={rows} />;
}
