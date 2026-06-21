import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      roleId?: string | null;
      isSystem?: boolean;
      permissions: string[];
      defaultLocationId?: string | null;
      accessibleLocationIds?: string[];
      activeLocationId?: string | null;
    };
  }

  interface User {
    id: string;
    role: string;
    roleId?: string | null;
    isSystem?: boolean;
    permissions: string[];
    defaultLocationId?: string | null;
    accessibleLocationIds?: string[];
    activeLocationId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    roleId?: string | null;
    isSystem?: boolean;
    permissions?: string[];
    defaultLocationId?: string | null;
    accessibleLocationIds?: string[];
    activeLocationId?: string | null;
  }
}
