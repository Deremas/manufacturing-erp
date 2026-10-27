import { BankReconciliationCreatePage } from "@/features/finance/BankReconciliationPages";
import { requireAuth } from "@/lib/auth/auth";
import { listBankAccountsForTransfer } from "@/services/finance/bank-transfer.service";
export const dynamic = "force-dynamic";
export default async function Page() { await requireAuth(); return <BankReconciliationCreatePage accounts={await listBankAccountsForTransfer()} />; }
