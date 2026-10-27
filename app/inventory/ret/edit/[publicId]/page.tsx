import { redirect } from "next/navigation";

import { publicEditUrl } from "@/lib/routing/urls";

export default async function LegacyReturnEditRedirect({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(publicEditUrl("inventory.return", publicId));
}
