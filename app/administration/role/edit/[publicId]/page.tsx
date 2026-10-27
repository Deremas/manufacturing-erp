import { notFound } from "next/navigation";

import { RoleFormPage } from "@/features/administration/roles";
import { getPermissionGroups, getRoleById } from "@/lib/administration-db";

export default async function AdministrationRoleEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [role, permissionGroups] = await Promise.all([
    getRoleById(publicId),
    getPermissionGroups(),
  ]);
  if (!role) notFound();

  return (
    <RoleFormPage
      initialData={role}
      isCreating={false}
      permissionGroups={permissionGroups}
    />
  );
}
