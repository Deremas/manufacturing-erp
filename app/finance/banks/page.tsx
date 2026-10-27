import BankMovementPage from "@/features/finance/BankMovementPage";
import { requireAuth } from "@/lib/auth/auth";
import { getBankMovementReport } from "@/services/accounting/accounting.service";

export const dynamic = "force-dynamic";

export default async function FinanceBanksPage() {
  await requireAuth();
  const report = await getBankMovementReport();
  return <BankMovementPage report={report} />;
}
