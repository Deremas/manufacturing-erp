import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

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
            u."isActive"
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

        const accessibleLocationIds = user.isSystem
          ? allLocationRows.map((item) => item.locationId)
          : locationRows.map((item) => item.locationId);
        const defaultLocationId =
          locationRows.find((item) => item.isDefault)?.locationId ??
          accessibleLocationIds[0] ??
          null;
        const activeLocationId = defaultLocationId ?? accessibleLocationIds[0] ?? null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roleId: user.roleId,
          isSystem: user.isSystem,
          permissions: user.isSystem
            ? ["*"]
            : permissionRows.map((item) => `${item.module}.${item.action}`),
          defaultLocationId,
          accessibleLocationIds,
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
        token.defaultLocationId = (user as any).defaultLocationId ?? null;
        token.accessibleLocationIds = (user as any).accessibleLocationIds ?? [];
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
      (session as any).user.defaultLocationId = token.defaultLocationId ?? null;
      (session as any).user.accessibleLocationIds =
        token.accessibleLocationIds ?? [];
      (session as any).user.activeLocationId = token.activeLocationId ?? null;
      return session;
    },
  },
};
