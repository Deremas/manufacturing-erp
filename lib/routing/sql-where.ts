import { sql } from "@/lib/db";
import { isPublicIdParam } from "./public-id";

/** Build a WHERE clause fragment for id or publicId lookup. */
export function whereDocumentKey(alias: string, key: string) {
  const col = alias ? `${alias}.` : "";
  if (isPublicIdParam(key)) {
    return sql`${sql.unsafe(col)}"publicId" = ${Number(key)}`;
  }
  return sql`${sql.unsafe(col)}id = ${key}`;
}
