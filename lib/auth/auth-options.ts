import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

function buildEffectivePermissions(input: {
  isSystem: boolean;
  rolePermissions: string[];
  allowPermissions: string[];
  denyPermissions: string[];
}) {
  if (input.isSystem) {
    return ["*"];
  }

  const denied = new Set(input.denyPermissions);
  const merged = Array.from(
    new Set([...input.rolePermissions, ...input.allowPermissions]),
  ).filter((permission) => !denied.has(permission));

  return merged.sort();
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username, Email, or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password;

        if (!identifier || !password) {
          return null;
        }

        const [user] = await sql<
        Array<{
          id: string;
          name: string;
          email: string;
          password: string | null;
          role: string;
          roleId: string | null;
          isSystem: boolean;
          phone: string | null;
          isActive: boolean;
          salesAllowPermissions: string[] | null;
          salesDenyPermissions: string[] | null;
        }>
      >`
          select
            u."id",
            u."name",
            u."email",
            u."password",
            u."role",
            u."roleId",
            coalesce(r."isSystem", false) as "isSystem",
            u."phone",
            u."isActive",
            u."salesAllowPermissions",
            u."salesDenyPermissions"
          from "User" u
          left join "Role" r on r."id" = u."roleId"
          where u."email" = ${identifier}
            or u."username" = ${identifier}
            or u."phone" = ${identifier}
          limit 1
        `;

        if (!user || !user.isActive || !user.password) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
          return null;
        }

        const permissionRows = user.roleId
          ? user.isSystem
            ? await sql<Array<{ module: string; action: string }>>`
                select module, action
                from "Permission"
                where "isArchived" = false
              `
            : await sql<Array<{ module: string; action: string }>>`
              select
                rp."module",
                rp."action"
              from "RolePermission" rp
              where rp."roleId" = ${user.roleId}
                and rp."isArchived" = false
            `
          : [];

        const locationRows = await sql<
          Array<{ locationId: string; isDefault: boolean }>
        >`
          select
            ul."locationId",
            ul."isDefault"
          from "UserLocation" ul
          where ul."userId" = ${user.id}
        `;

        const allLocationRows = user.isSystem
          ? await sql<Array<{ locationId: string }>>`
              select id as "locationId"
              from "Location"
              where "isArchived" = false
              order by "locationName" asc
            `
          : [];

        const departmentRows = await sql<Array<{ departmentId: string }>>`
          SELECT "departmentId" FROM "UserDepartment" WHERE "userId" = ${user.id}
        `;
        const allDepartmentRows = user.isSystem
          ? await sql<Array<{ departmentId: string }>>`
              SELECT id AS "departmentId" FROM "Department" WHERE "isArchived" = false
            `
          : [];

        const accessibleLocationIds = user.isSystem
          ? allLocationRows.map((item) => item.locationId)
          : locationRows.map((item) => item.locationId);
        const defaultLocationId =
          locationRows.find((item) => item.isDefault)?.locationId ??
          accessibleLocationIds[0] ??
          null;
        const activeLocationId = defaultLocationId ?? accessibleLocationIds[0] ?? null;
        const accessibleDepartmentIds = (user.isSystem ? allDepartmentRows : departmentRows)
          .map((item) => item.departmentId);
        const rolePermissions = permissionRows.map(
          (item) => `${item.module}.${item.action}`,
        );
        const salesAllowPermissions = user.salesAllowPermissions ?? [];
        const salesDenyPermissions = user.salesDenyPermissions ?? [];
        const effectivePermissions = buildEffectivePermissions({
          isSystem: user.isSystem,
          rolePermissions,
          allowPermissions: salesAllowPermissions,
          denyPermissions: salesDenyPermissions,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roleId: user.roleId,
          isSystem: user.isSystem,
          permissions: effectivePermissions,
          salesAllowPermissions,
          salesDenyPermissions,
          defaultLocationId,
          accessibleLocationIds,
          accessibleDepartmentIds,
          activeLocationId,
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).id;
        token.role = (user as any).role;
        token.roleId = (user as any).roleId ?? null;
        token.isSystem = (user as any).isSystem ?? false;
        token.permissions = (user as any).permissions ?? [];
        token.salesAllowPermissions = (user as any).salesAllowPermissions ?? [];
        token.salesDenyPermissions = (user as any).salesDenyPermissions ?? [];
        token.defaultLocationId = (user as any).defaultLocationId ?? null;
        token.accessibleLocationIds = (user as any).accessibleLocationIds ?? [];
        token.accessibleDepartmentIds = (user as any).accessibleDepartmentIds ?? [];
        token.activeLocationId = (user as any).activeLocationId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).user.id = token.userId;
      (session as any).user.role = token.role;
      (session as any).user.roleId = token.roleId ?? null;
      (session as any).user.isSystem = token.isSystem ?? false;
      (session as any).user.permissions = token.permissions ?? [];
      (session as any).user.salesAllowPermissions = token.salesAllowPermissions ?? [];
      (session as any).user.salesDenyPermissions = token.salesDenyPermissions ?? [];
      (session as any).user.defaultLocationId = token.defaultLocationId ?? null;
      (session as any).user.accessibleLocationIds =
        token.accessibleLocationIds ?? [];
      (session as any).user.accessibleDepartmentIds = token.accessibleDepartmentIds ?? [];
      (session as any).user.activeLocationId = token.activeLocationId ?? null;
      return session;
    },
  },
};
