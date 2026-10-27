import { notFound } from "next/navigation";
import { BankReconciliationDetailPage } from "@/features/finance/BankReconciliationPages";
import { requireAuth } from "@/lib/auth/auth";
import { getBankReconciliation } from "@/services/finance/bank-reconciliation.service";

export const dynamic = "force-dynamic";

export default async function BankReconciliationViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  await requireAuth();
  const { publicId } = await params;
  const item = await getBankReconciliation(publicId);
  if (!item) notFound();
  return <BankReconciliationDetailPage record={item.record} movements={item.movements} />;
}
