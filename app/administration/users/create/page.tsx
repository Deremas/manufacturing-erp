import { UserFormPage } from "@/features/administration/users";
import { getLocations, getRoles } from "@/lib/administration-db";

export default async function CreateUserPage() {
  const [roles, locations] = await Promise.all([getRoles(), getLocations()]);
  return (
    <UserFormPage
      isCreating
      roles={roles.map((role) => ({ label: role.name, value: role.id }))}
      locations={locations.map((location) => ({
        label: `${location.locationName} (${location.locationCode})`,
        value: location.id,
      }))}
    />
  );
}
