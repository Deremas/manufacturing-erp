import { SalesPoliciesPage } from "@/features/administration/sales-policies/SalesPoliciesPage";
import {
  getRoleById,
  getRoles,
  getUserById,
  getUsers,
} from "@/lib/administration-db";

export default async function AdministrationSalesPoliciesPage() {
  const baseRoles = await getRoles();
  const baseUsers = await getUsers();

  const [roles, users] = await Promise.all([
    Promise.all(baseRoles.map(async (role) => (await getRoleById(role.id)) ?? role)),
    Promise.all(baseUsers.map(async (user) => (await getUserById(user.id)) ?? user)),
  ]);

  return <SalesPoliciesPage roles={roles} users={users} />;
}
