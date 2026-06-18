// ----------------------------------------------------------------------------
// NEW ERP — Badge Style Configuration
// ----------------------------------------------------------------------------
// Each badge variant defines the foreground (text), background, and border
// colours so that every component renders consistently.

export interface BadgeStyle {
  /** Text / foreground colour */
  text: string;
  /** Background colour */
  bg: string;
  /** Border colour (typically subtle to match the variant) */
  border: string;
}

export type BadgeVariant =
  | "active"
  | "inactive"
  | "pending"
  | "approved"
  | "rejected"
  | "posted"
  | "voided"
  | "draft"
  | "completed"
  | "low-stock"
  | "out-of-stock";

export type BadgeConfig = Record<BadgeVariant, BadgeStyle>;

// ----------------------------------------------------------------------------
// Status-based badges  (mapped from the semantic colour palette)
// ----------------------------------------------------------------------------
export const badges: BadgeConfig = {
  // ---- Operational states ----
  active: {
    text: "#166534", // success-800
    bg: "#dcfce7", // success-100
    border: "#bbf7d0", // success-200
  },
  inactive: {
    text: "#6b7280", // gray-500
    bg: "#f3f4f6", // gray-100
    border: "#e5e7eb", // gray-200
  },

  // ---- Approval workflow ----
  pending: {
    text: "#9a3412", // warning-800
    bg: "#ffedd5", // warning-100
    border: "#fed7aa", // warning-200
  },
  approved: {
    text: "#166534", // success-800
    bg: "#dcfce7", // success-100
    border: "#bbf7d0", // success-200
  },
  rejected: {
    text: "#991b1b", // danger-800
    bg: "#fee2e2", // danger-100
    border: "#fecaca", // danger-200
  },

  // ---- Posting / ledger states ----
  posted: {
    text: "#166534", // success-800
    bg: "#dcfce7", // success-100
    border: "#bbf7d0", // success-200
  },
  voided: {
    text: "#991b1b", // danger-800
    bg: "#fee2e2", // danger-100
    border: "#fecaca", // danger-200
  },

  // ---- Document lifecycle ----
  draft: {
    text: "#6b7280", // gray-500
    bg: "#f3f4f6", // gray-100
    border: "#e5e7eb", // gray-200
  },
  completed: {
    text: "#1e40af", // info-800
    bg: "#dbeafe", // info-100
    border: "#bfdbfe", // info-200
  },

  // ---- Inventory thresholds ----
  "low-stock": {
    text: "#9a3412", // warning-800
    bg: "#ffedd5", // warning-100
    border: "#fed7aa", // warning-200
  },
  "out-of-stock": {
    text: "#991b1b", // danger-800
    bg: "#fee2e2", // danger-100
    border: "#fecaca", // danger-200
  },
};

export default badges;
