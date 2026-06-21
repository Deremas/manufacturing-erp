import { UsersPage } from "@/features/administration";
import { getUsers } from "@/lib/administration-db";
import { getCurrentUser } from "@/lib/auth/auth";

export default async function AdministrationUsersPage() {
  const [users, currentUser] = await Promise.all([getUsers(), getCurrentUser()]);
  return (
    <UsersPage
      initialData={users}
      currentUserId={currentUser?.id ?? null}
    />
  );
}
