// components/transactions/DocumentStatusBadge.tsx
// Reusable status badge for any transaction document.

import { cn } from "@/lib/utils/cn";
import type { DocumentStatus } from "@/services/transactions/types";

export interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  size?: "sm" | "md";
  className?: string;
}

const STATUS_STYLES: Record<
  DocumentStatus,
  { bg: string; text: string; ring: string; label: string }
> = {
  DRAFT: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    ring: "ring-gray-300",
    label: "Draft",
  },
  PENDING: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    ring: "ring-orange-300",
    label: "Pending",
  },
  APPROVED: {
    bg: "bg-green-100",
    text: "text-green-800",
    ring: "ring-green-300",
    label: "Approved",
  },
  REJECTED: {
    bg: "bg-red-100",
    text: "text-red-800",
    ring: "ring-red-300",
    label: "Rejected",
  },
  POSTED: {
    bg: "bg-teal-100",
    text: "text-teal-800",
    ring: "ring-teal-300",
    label: "Posted",
  },
  VOIDED: {
    bg: "bg-gray-800",
    text: "text-white",
    ring: "ring-gray-600",
    label: "Voided",
  },
  CANCELLED: {
    bg: "bg-gray-100",
    text: "text-gray-500",
    ring: "ring-gray-200",
    label: "Cancelled",
  },
  ARCHIVED: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    ring: "ring-blue-300",
    label: "Archived",
  },
};

export function DocumentStatusBadge({
  status,
  size = "md",
  className,
}: DocumentStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  const sizeClasses =
    size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-medium ring-1 ring-inset",
        sizeClasses,
        style.bg,
        style.text,
        style.ring,
        className,
      )}
    >
      {style.label}
    </span>
  );
}

export default DocumentStatusBadge;
