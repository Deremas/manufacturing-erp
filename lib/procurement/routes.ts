export type ProcurementDocKind =
  | "pr"
  | "po"
  | "grn"
  | "invoice"
  | "payment"
  | "return";

import {
  publicCreateUrl,
  publicEditUrl,
  publicListUrl,
  publicPrintUrl,
  publicViewUrl,
  type PublicRouteKey,
} from "@/lib/routing/urls";

const PROCUREMENT_ROUTE_KEYS: Record<ProcurementDocKind, PublicRouteKey> = {
  pr: "procurement.pr",
  po: "procurement.po",
  grn: "procurement.grn",
  invoice: "procurement.invoice",
  payment: "procurement.payment",
  return: "procurement.return",
};

export {
  isPublicIdParam,
  resolveDocumentKey,
} from "@/lib/routing/public-id";

export function procurementGrnRegisterAssetsUrl(publicId: number | string): string {
  return `/procurement/grn/register-assets/${publicId}`;
}

export function procurementViewUrl(
  kind: ProcurementDocKind,
  publicId: number | string,
): string {
  return publicViewUrl(PROCUREMENT_ROUTE_KEYS[kind], publicId);
}

export function procurementEditUrl(
  kind: ProcurementDocKind,
  publicId: number | string,
): string {
  return publicEditUrl(PROCUREMENT_ROUTE_KEYS[kind], publicId);
}

export function procurementListUrl(kind: ProcurementDocKind): string {
  return publicListUrl(PROCUREMENT_ROUTE_KEYS[kind]);
}

export function procurementPrintUrl(
  kind: Extract<ProcurementDocKind, "invoice" | "payment">,
  publicId: number | string,
): string {
  return publicPrintUrl(PROCUREMENT_ROUTE_KEYS[kind], publicId);
}

export function procurementCreateUrl(
  kind: ProcurementDocKind,
  query?: Record<string, number | string | undefined | null>,
): string {
  return publicCreateUrl(PROCUREMENT_ROUTE_KEYS[kind], query);
}
