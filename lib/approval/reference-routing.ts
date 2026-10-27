import { approvalViewUrl } from "@/lib/routing/urls";

export type ApprovalReferenceMeta = {
  label: string;
  href: (publicId: number | string) => string;
};

const APPROVAL_LABELS: Record<string, string> = {
  "procurement.pr": "Purchase Requisition",
  "procurement.po": "Purchase Order",
  "procurement.grn": "Goods Receipt",
  "procurement.invoice": "Supplier Invoice",
  "procurement.payment": "Supplier Payment",
  "procurement.supplier-return": "Supplier Return",
  "inventory.transfer": "Stock Transfer",
  "inventory.adjustment": "Stock Adjustment",
  "inventory.issue": "Stock Issue",
  "inventory.return": "Stock Return",
  "inventory.requisition": "Store Requisition",
};

export function getApprovalReferenceMeta(referenceType: string): ApprovalReferenceMeta {
  return {
    label:
      APPROVAL_LABELS[referenceType] ??
      referenceType.replaceAll(".", " ").replaceAll("_", " "),
    href: (publicId) => approvalViewUrl(referenceType, publicId),
  };
}

export function resolveApprovalHref(
  referenceType: string,
  publicId: number | string,
): string {
  return getApprovalReferenceMeta(referenceType).href(publicId);
}
