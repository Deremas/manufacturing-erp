import { UserFormPage } from "@/features/administration/users";
import { getLocations, getRoles } from "@/lib/administration-db";
import { sql } from "@/lib/db";

export default async function CreateUserPage() {
  const [roles, locations, departments] = await Promise.all([getRoles(), getLocations(), sql<Array<{ id: string; code: string; name: string }>>`SELECT id, code, name FROM "Department" WHERE "isActive" = true AND "isArchived" = false ORDER BY name`]);
  return (
    <UserFormPage
      isCreating
      submitEndpoint="/api/administration/users"
      successHref="/administration/users"
      roles={roles.map((role) => ({ label: role.name, value: role.id }))}
      locations={locations.map((location) => ({
        label: `${location.locationName} (${location.locationCode})`,
        value: location.id,
      }))}
      departments={departments.map((department) => ({ label: `${department.name} (${department.code})`, value: department.id }))}
    />
  );
}
