import {
  getPublicRouteDef,
  PUBLIC_ROUTE_REGISTRY,
  type PublicRouteDef,
  type PublicRouteKey,
} from "./registry";

export type { PublicRouteKey, PublicRouteDef };
export { PUBLIC_ROUTE_REGISTRY, getPublicRouteDef };

export function publicViewUrl(
  key: PublicRouteKey,
  publicId: number | string,
): string {
  const def = getPublicRouteDef(key);
  return `/${def.module}/${def.code}/view/${publicId}`;
}

export function publicViewUrlFromPayload(
  key: PublicRouteKey,
  payload:
    | { publicId?: number | string | null; item?: { publicId?: number | string | null } }
    | null
    | undefined,
  fallback: string,
): string {
  const publicId = payload?.publicId ?? payload?.item?.publicId;
  if (publicId == null || String(publicId).length === 0) return fallback;
  return publicViewUrl(key, publicId);
}

export function publicEditUrl(
  key: PublicRouteKey,
  publicId: number | string,
): string {
  const def = getPublicRouteDef(key);
  return `/${def.module}/${def.code}/edit/${publicId}`;
}

export function publicPrintUrl(
  key: PublicRouteKey,
  publicId: number | string,
): string {
  const def = getPublicRouteDef(key);
  return `/${def.module}/${def.code}/print/${publicId}`;
}

export function publicListUrl(key: PublicRouteKey): string {
  return getPublicRouteDef(key).list;
}

export function publicCreateUrl(
  key: PublicRouteKey,
  query?: Record<string, number | string | undefined | null>,
): string {
  const base = `${getPublicRouteDef(key).list}/create`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      params.set(name, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Map approval reference types to public route keys. */
export const APPROVAL_ROUTE_KEYS: Record<string, PublicRouteKey> = {
  "procurement.pr": "procurement.pr",
  "procurement.po": "procurement.po",
  "procurement.grn": "procurement.grn",
  "procurement.invoice": "procurement.invoice",
  "procurement.payment": "procurement.payment",
  "procurement.supplier-return": "procurement.return",
  "inventory.transfer": "inventory.transfer",
  "inventory.adjustment": "inventory.adjustment",
  "inventory.issue": "inventory.issue",
  "inventory.return": "inventory.return",
  "inventory.requisition": "inventory.requisition",
};

export function approvalViewUrl(
  referenceType: string,
  publicId: number | string,
): string {
  const key = APPROVAL_ROUTE_KEYS[referenceType];
  if (!key) return "#";
  return publicViewUrl(key, publicId);
}
