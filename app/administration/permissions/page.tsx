import { PermissionsPage } from "@/features/administration";
import { getPermissionGroups } from "@/lib/administration-db";

export default async function AdministrationPermissionsPage() {
  const groups = (await getPermissionGroups()).map((group) => ({
    module: group.module,
    label: group.label,
    permissions: group.permissions.map((permission) => ({
      code: `${permission.module}.${permission.action}`,
      action: permission.action.replace(/\b\w/g, (char) => char.toUpperCase()),
      description: permission.label,
    })),
  }));
  return <PermissionsPage groups={groups} />;
}
