import { BankReconciliationListPage } from "@/features/finance/BankReconciliationPages";
import { requireAuth } from "@/lib/auth/auth";
import { listBankReconciliations } from "@/services/finance/bank-reconciliation.service";
export const dynamic = "force-dynamic";
export default async function Page() { await requireAuth(); return <BankReconciliationListPage rows={await listBankReconciliations()} />; }
