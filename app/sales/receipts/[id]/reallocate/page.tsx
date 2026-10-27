import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";

export default async function ReallocateReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  redirect(`/sales/receipts/${id}/edit`);
}
