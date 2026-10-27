import { notFound } from "next/navigation";
import { BankTransferDetailPage } from "@/features/finance/BankTransferPages";
import { requireAuth } from "@/lib/auth/auth";
import { getBankTransfer } from "@/services/finance/bank-transfer.service";

export const dynamic = "force-dynamic";

export default async function BankTransferViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  await requireAuth();
  const { publicId } = await params;
  const item = await getBankTransfer(publicId);
  if (!item) notFound();
  return <BankTransferDetailPage transfer={item} />;
}
