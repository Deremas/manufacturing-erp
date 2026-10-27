import { notFound, redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { getPublicRouteDef, type PublicRouteKey } from "./registry";
import { publicEditUrl, publicPrintUrl, publicViewUrl } from "./urls";

type LegacyAction = "view" | "edit" | "print";

const LOOKUP_SQL: Partial<Record<PublicRouteKey, (id: string) => Promise<number | null>>> = {
  // Populated lazily via dynamic queries per table
};

async function lookupPublicId(
  routeKey: PublicRouteKey,
  legacyId: string,
): Promise<number | null> {
  if (LOOKUP_SQL[routeKey]) {
    return LOOKUP_SQL[routeKey]!(legacyId);
  }

  const table = getPublicRouteDef(routeKey).model;
  const rows = await sql.unsafe<Array<{ publicId: number }>>(
    `SELECT "publicId" FROM "${table}" WHERE id = $1 LIMIT 1`,
    [legacyId],
  );
  return rows[0]?.publicId ?? null;
}

/**
 * Redirect a legacy cuid/[id] route to the new publicId URL.
 */
export async function redirectLegacyToPublicUrl(
  routeKey: PublicRouteKey,
  legacyId: string,
  action: LegacyAction = "view",
) {
  const publicId = await lookupPublicId(routeKey, legacyId);
  if (publicId == null) notFound();

  const target =
    action === "edit"
      ? publicEditUrl(routeKey, publicId)
      : action === "print"
        ? publicPrintUrl(routeKey, publicId)
        : publicViewUrl(routeKey, publicId);

  redirect(target);
}
