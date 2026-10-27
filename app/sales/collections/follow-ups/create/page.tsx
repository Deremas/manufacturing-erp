import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";

export default async function CreateCollectionFollowUpPage() {
  await requireAuth();
  redirect("/sales/collections/follow-ups?mode=create");
}
