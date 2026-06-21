export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId?: string | null;
  isSystem?: boolean;
  permissions: string[];
  defaultLocationId?: string | null;
  accessibleLocationIds?: string[];
  activeLocationId?: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const session = (await response.json()) as {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      roleId?: string | null;
      isSystem?: boolean;
      permissions?: string[];
      defaultLocationId?: string | null;
      accessibleLocationIds?: string[];
      activeLocationId?: string | null;
    };
  } | null;

  if (!session?.user) {
    return null;
  }

  const user = session.user as {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    roleId?: string | null;
    isSystem?: boolean;
    permissions?: string[];
    defaultLocationId?: string | null;
    accessibleLocationIds?: string[];
    activeLocationId?: string | null;
  };

  return {
    id: user.id ?? "",
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role ?? "user",
    roleId: user.roleId ?? null,
    isSystem: user.isSystem ?? false,
    permissions: user.permissions ?? [],
    defaultLocationId: user.defaultLocationId ?? null,
    accessibleLocationIds: user.accessibleLocationIds ?? [],
    activeLocationId: user.activeLocationId ?? null,
  };
}
