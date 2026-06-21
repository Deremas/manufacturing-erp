import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth-options";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId?: string | null;
  isSystem?: boolean;
  avatar?: string;
  permissions: string[];
  defaultLocationId?: string | null;
  accessibleLocationIds?: string[];
  activeLocationId?: string | null;
}

export interface Session {
  user: User;
  expires: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as User) : null;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

export function requireRole(role: string) {
  return async () => {
    const user = await requireAuth();
    if (user.role !== role && !user.permissions.includes("*")) {
      redirect("/dashboard");
    }
    return user;
  };
}

export async function getSession(): Promise<Session | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
