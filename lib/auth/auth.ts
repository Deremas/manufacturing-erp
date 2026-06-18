// lib/auth/auth.ts
// Authentication service for NEW ERP
// Placeholder implementation — to be wired to next-auth or a real auth provider

import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  permissions: string[];
  locations: string[];
}

export interface Session {
  user: User;
  expires: string;
}

// ─── Placeholder session helpers ─────────────────────────────────────────────

/**
 * Return the current session user.
 * In development this returns a placeholder admin user.
 * Replace with real `getServerSession` from next-auth when ready.
 */
export async function getCurrentUser(
  req?: NextApiRequest | GetServerSidePropsContext["req"],
  res?: NextApiResponse | GetServerSidePropsContext["res"],
): Promise<User | null> {
  // TODO: Wire to next-auth getServerSession(authOptions, req, res)
  // For now return a placeholder so the UI can develop against it.
  return {
    id: "placeholder-user-id",
    name: "Admin User",
    email: "admin@konel.local",
    role: "super_admin",
    avatar: undefined,
    permissions: ["*"],
    locations: ["HQ"],
  };
}

/**
 * Require an authenticated session.
 * Returns the user if authenticated, otherwise redirects to `/auth/login`.
 */
export async function requireAuth(
  context: GetServerSidePropsContext,
): Promise<User> {
  const user = await getCurrentUser(context.req, context.res);

  if (!user) {
    // Redirect to login — works for both SSR and API routes
    if (context.res) {
      context.res.writeHead(302, { Location: "/auth/login" });
      context.res.end();
    }
    throw new Error("Authentication required");
  }

  return user;
}

/**
 * Require the current user to have a specific role.
 * Throws / redirects if the user does not match.
 */
export function requireRole(role: string) {
  return async (context: GetServerSidePropsContext) => {
    const user = await requireAuth(context);

    if (user.role !== role) {
      if (context.res) {
        context.res.writeHead(302, { Location: "/403" });
        context.res.end();
      }
      throw new Error(`Forbidden — requires role "${role}"`);
    }

    return user;
  };
}

/**
 * Helper that returns both the session and the user in one call.
 * Useful when a page needs session metadata (e.g. expiry).
 */
export async function getSession(
  req?: NextApiRequest | GetServerSidePropsContext["req"],
  res?: NextApiResponse | GetServerSidePropsContext["res"],
): Promise<Session | null> {
  const user = await getCurrentUser(req, res);
  if (!user) return null;

  return {
    user,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 h placeholder
  };
}
