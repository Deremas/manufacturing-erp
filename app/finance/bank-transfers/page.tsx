import { BankTransferListPage } from "@/features/finance/BankTransferPages";
import { requireAuth } from "@/lib/auth/auth";
import { listBankTransfers } from "@/services/finance/bank-transfer.service";

export const dynamic = "force-dynamic";
export default async function BankTransfersRoute() { await requireAuth(); return <BankTransferListPage rows={await listBankTransfers()} />; }
