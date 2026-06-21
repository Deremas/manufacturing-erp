import { notFound } from "next/navigation";
import { RoleFormPage } from "@/features/administration/roles";
import { getPermissionGroups, getRoleById } from "@/lib/administration-db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRolePage({ params }: PageProps) {
  const { id } = await params;
  const [role, permissionGroups] = await Promise.all([
    getRoleById(id),
    getPermissionGroups(),
  ]);

  if (!role) {
    notFound();
  }

  return (
    <RoleFormPage
      initialData={role}
      isCreating={false}
      permissionGroups={permissionGroups}
    />
  );
}
