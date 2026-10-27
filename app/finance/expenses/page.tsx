import { requireAuth } from "@/lib/auth/auth";
import { getExpenseRegisterRows } from "@/services/accounting/accounting.service";
import ExpenseRegisterPage from "@/features/finance/ExpenseRegisterPage";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await requireAuth();
  const rows = await getExpenseRegisterRows();
  return <ExpenseRegisterPage rows={rows} />;
}
