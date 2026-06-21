import { RoleFormPage } from "@/features/administration/roles";
import { getPermissionGroups } from "@/lib/administration-db";

export default async function CreateRolePage() {
  const permissionGroups = await getPermissionGroups();
  return <RoleFormPage isCreating permissionGroups={permissionGroups} />;
}
