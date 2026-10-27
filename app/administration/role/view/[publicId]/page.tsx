import { notFound } from "next/navigation";

import { RoleDetailPage } from "@/features/administration/roles";
import { getRoleById } from "@/lib/administration-db";

export default async function AdministrationRoleViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const role = await getRoleById(publicId);
  if (!role) notFound();
  return <RoleDetailPage role={role} />;
}
