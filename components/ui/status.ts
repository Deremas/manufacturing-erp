// ----------------------------------------------------------------------------
// NEW ERP — Status Configuration
// ----------------------------------------------------------------------------
// Enumerated status types used throughout the system, each carrying its
// semantic colour token, human-readable label, and icon identifier.

// ----------------------------------------------------------------------------
// StatusType enum
// ----------------------------------------------------------------------------
export enum StatusType {
  Active = "active",
  Inactive = "inactive",
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Posted = "posted",
  Voided = "voided",
  Draft = "draft",
  Completed = "completed",
  LowStock = "low-stock",
  OutOfStock = "out-of-stock",
}

// ----------------------------------------------------------------------------
// Per-status configuration shape
// ----------------------------------------------------------------------------
export interface StatusConfigEntry {
  /** Human-readable label (e.g. "Low Stock") */
  label: string;
  /** CSS colour value for the dot / indicator */
  color: string;
  /** Background colour for badge / pill */
  bgColor: string;
  /** Icon identifier consumed by an <Icon> component (string or component key) */
  icon: string;
}

export type StatusConfigMap = Record<StatusType, StatusConfigEntry>;

// ----------------------------------------------------------------------------
// Status configurations
// ----------------------------------------------------------------------------
export const statusConfig: StatusConfigMap = {
  [StatusType.Active]: {
    label: "Active",
    color: "#22c55e",
    bgColor: "#dcfce7",
    icon: "CircleCheck",
  },
  [StatusType.Inactive]: {
    label: "Inactive",
    color: "#9ca3af",
    bgColor: "#f3f4f6",
    icon: "CircleMinus",
  },
  [StatusType.Pending]: {
    label: "Pending",
    color: "#f97316",
    bgColor: "#ffedd5",
    icon: "Clock",
  },
  [StatusType.Approved]: {
    label: "Approved",
    color: "#22c55e",
    bgColor: "#dcfce7",
    icon: "ThumbsUp",
  },
  [StatusType.Rejected]: {
    label: "Rejected",
    color: "#ef4444",
    bgColor: "#fee2e2",
    icon: "ThumbsDown",
  },
  [StatusType.Posted]: {
    label: "Posted",
    color: "#22c55e",
    bgColor: "#dcfce7",
    icon: "ArrowUpToLine",
  },
  [StatusType.Voided]: {
    label: "Voided",
    color: "#ef4444",
    bgColor: "#fee2e2",
    icon: "Ban",
  },
  [StatusType.Draft]: {
    label: "Draft",
    color: "#9ca3af",
    bgColor: "#f3f4f6",
    icon: "FilePen",
  },
  [StatusType.Completed]: {
    label: "Completed",
    color: "#3b82f6",
    bgColor: "#dbeafe",
    icon: "CheckCircle",
  },
  [StatusType.LowStock]: {
    label: "Low Stock",
    color: "#f97316",
    bgColor: "#ffedd5",
    icon: "PackageMinus",
  },
  [StatusType.OutOfStock]: {
    label: "Out of Stock",
    color: "#ef4444",
    bgColor: "#fee2e2",
    icon: "PackageX",
  },
};

// ----------------------------------------------------------------------------
// Helper: resolve a config entry by StatusType key (string-safe)
// ----------------------------------------------------------------------------
export function getStatusConfig(
  status: StatusType | string,
): StatusConfigEntry {
  const key = typeof status === "string" ? status : status;
  const entry = statusConfig[key as StatusType];
  if (!entry) {
    // Fallback to a neutral unknown state
    return {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: "#9ca3af",
      bgColor: "#f3f4f6",
      icon: "HelpCircle",
    };
  }
  return entry;
}

export default statusConfig;
