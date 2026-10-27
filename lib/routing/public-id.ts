/** Returns true when a route/API param is a numeric public id (e.g. "79"). */
export function isPublicIdParam(value: string): boolean {
  return /^\d+$/.test(String(value).trim());
}

/** Build a SQL WHERE fragment value for id vs publicId lookup. */
export function resolveDocumentKey(
  key: string,
): { column: "id" | "publicId"; value: string | number } {
  if (isPublicIdParam(key)) {
    return { column: "publicId", value: Number(key) };
  }
  return { column: "id", value: key };
}
