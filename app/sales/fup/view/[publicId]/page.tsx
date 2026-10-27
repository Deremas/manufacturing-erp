import { notFound, redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getCollectionFollowUpById } from "@/services/sales/collections.service";

export default async function CollectionFollowUpViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  await requireAuth();
  const { publicId } = await params;
  const item = await getCollectionFollowUpById(publicId);
  if (!item) notFound();
  redirect(`/sales/collections/follow-ups?edit=${encodeURIComponent(item.id)}`);
}
