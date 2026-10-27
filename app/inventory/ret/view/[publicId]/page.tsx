import { redirect } from "next/navigation";

import { publicViewUrl } from "@/lib/routing/urls";

export default async function LegacyReturnViewRedirect({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(publicViewUrl("inventory.return", publicId));
}
