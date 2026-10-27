import CashBookLivePage from "@/features/finance/CashBookLivePage";
import { requireAuth } from "@/lib/auth/auth";
import { getCashBookRows } from "@/services/accounting/accounting.service";

export const dynamic = "force-dynamic";

export default async function CashBookPage() {
  await requireAuth();
  const rows = await getCashBookRows();
  return <CashBookLivePage rows={rows} />;
}
