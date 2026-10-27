import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export default async function ReceivableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  redirect(`/sales/invoices/${id}`);
}
