import Link from "next/link";
import { Users } from "lucide-react";

import { UserFormPage } from "@/features/administration/users";
import { getLocations, getRoles, getUserById } from "@/lib/administration-db";
import { sql } from "@/lib/db";
import { publicViewUrl } from "@/lib/routing/urls";

export default async function AdministrationUserEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const user = await getUserById(publicId);
  if (!user) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "24px" }}>
        <div style={{ maxWidth: "560px", width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "32px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <Users size={36} strokeWidth={1.8} />
          <h2 style={{ margin: "16px 0 8px", fontSize: "28px" }}>User not found</h2>
          <div style={{ marginTop: "24px" }}>
            <Link href="/administration/users" style={{ display: "inline-flex", padding: "12px 18px", borderRadius: "12px", background: "#008c7a", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
              Back to Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [roles, locations, departments, userDepartments] = await Promise.all([
    getRoles(),
    getLocations(),
    sql<Array<{ id: string; code: string; name: string }>>`SELECT id, code, name FROM "Department" WHERE "isActive" = true AND "isArchived" = false ORDER BY name`,
    sql<Array<{ departmentId: string }>>`SELECT "departmentId" FROM "UserDepartment" WHERE "userId" = ${user.id}`,
  ]);

  return (
    <UserFormPage
      initialData={{ ...user, accessibleDepartmentIds: userDepartments.map((row) => row.departmentId) }}
      isCreating={false}
      submitEndpoint={`/api/administration/users/${user.id}`}
      successHref={publicViewUrl("administration.user", user.publicId)}
      roles={roles.map((role) => ({ label: role.name, value: role.id }))}
      locations={locations.map((location) => ({
        label: `${location.locationName} (${location.locationCode})`,
        value: location.id,
      }))}
      departments={departments.map((department) => ({
        label: `${department.name} (${department.code})`,
        value: department.id,
      }))}
    />
  );
}
