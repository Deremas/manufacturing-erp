import { BankTransferCreatePage } from "@/features/finance/BankTransferPages";
import { requireAuth } from "@/lib/auth/auth";
import { listBankAccountsForTransfer } from "@/services/finance/bank-transfer.service";

export const dynamic = "force-dynamic";
export default async function CreateBankTransferRoute() { await requireAuth(); return <BankTransferCreatePage accounts={await listBankAccountsForTransfer()} />; }
