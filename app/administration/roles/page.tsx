import { RolesListPage } from "@/features/administration/roles";
import { getRoles } from "@/lib/administration-db";

export default async function AdministrationRolesPage() {
  const roles = await getRoles();
  return <RolesListPage initialData={roles} />;
}
