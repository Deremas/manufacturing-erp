import FinancialStatementsLivePage from "@/features/finance/FinancialStatementsLivePage";
import { requireAuth } from "@/lib/auth/auth";
import { getFinancialStatementRows } from "@/services/accounting/accounting.service";

export const dynamic = "force-dynamic";

export default async function FinancialStatementsPage() {
  await requireAuth();
  const rows = await getFinancialStatementRows();
  return <FinancialStatementsLivePage rows={rows} />;
}
