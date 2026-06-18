// ----------------------------------------------------------------------------
// NEW ERP — Theme Colors
// ----------------------------------------------------------------------------
// Centralized color palette used across all UI components.
// All values are expressed as CSS custom property values for runtime
// consistency with Tailwind / PostCSS / plain CSS.

export type ColorShade =
  | 50
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;

export type ColorScale = Record<ColorShade, string>;

export interface TextColors {
  /** ~ #1f2937 – High-emphasis content */
  primary: string;
  /** ~ #6b7280 – Medium-emphasis content */
  secondary: string;
  /** ~ #9ca3af – Low-emphasis / placeholder content */
  muted: string;
  /** ~ #ffffff – Text on dark / coloured backgrounds */
  inverse: string;
}

export interface ThemeColors {
  primary: ColorScale & { DEFAULT: string };
  secondary: ColorScale & { DEFAULT: string };
  success: ColorScale & { DEFAULT: string };
  warning: ColorScale & { DEFAULT: string };
  danger: ColorScale & { DEFAULT: string };
  info: ColorScale & { DEFAULT: string };
  background: string;
  surface: string;
  border: string;
  text: TextColors;
}

// ----------------------------------------------------------------------------
// Primary – Teal
// ----------------------------------------------------------------------------
const primary: ColorScale & { DEFAULT: string } = {
  50: "#e0f2f1",
  100: "#b2dfdb",
  200: "#80cbc4",
  300: "#4db6ac",
  400: "#26a69a",
  500: "#009688",
  600: "#00897b",
  700: "#00796b",
  800: "#00695c",
  900: "#004d40",
  DEFAULT: "#00897b", // 600
};

// ----------------------------------------------------------------------------
// Secondary – Gray / Slate
// ----------------------------------------------------------------------------
const secondary: ColorScale & { DEFAULT: string } = {
  50: "#f1f5f9",
  100: "#e2e8f0",
  200: "#cbd5e1",
  300: "#94a3b8",
  400: "#64748b",
  500: "#475569",
  600: "#334155",
  700: "#1e293b",
  800: "#0f172a",
  900: "#020617",
  DEFAULT: "#475569", // 500
};

// ----------------------------------------------------------------------------
// Semantic colours
// ----------------------------------------------------------------------------
const success: ColorScale & { DEFAULT: string } = {
  50: "#f0fdf4",
  100: "#dcfce7",
  200: "#bbf7d0",
  300: "#86efac",
  400: "#4ade80",
  500: "#22c55e",
  600: "#16a34a",
  700: "#15803d",
  800: "#166534",
  900: "#14532d",
  DEFAULT: "#22c55e", // 500
};

const warning: ColorScale & { DEFAULT: string } = {
  50: "#fff7ed",
  100: "#ffedd5",
  200: "#fed7aa",
  300: "#fdba74",
  400: "#fb923c",
  500: "#f97316",
  600: "#ea580c",
  700: "#c2410c",
  800: "#9a3412",
  900: "#7c2d12",
  DEFAULT: "#f97316", // 500
};

const danger: ColorScale & { DEFAULT: string } = {
  50: "#fef2f2",
  100: "#fee2e2",
  200: "#fecaca",
  300: "#fca5a5",
  400: "#f87171",
  500: "#ef4444",
  600: "#dc2626",
  700: "#b91c1c",
  800: "#991b1b",
  900: "#7f1d1d",
  DEFAULT: "#ef4444", // 500
};

const info: ColorScale & { DEFAULT: string } = {
  50: "#eff6ff",
  100: "#dbeafe",
  200: "#bfdbfe",
  300: "#93c5fd",
  400: "#60a5fa",
  500: "#3b82f6",
  600: "#2563eb",
  700: "#1d4ed8",
  800: "#1e40af",
  900: "#1e3a8a",
  DEFAULT: "#3b82f6", // 500
};

// ----------------------------------------------------------------------------
// Composite object
// ----------------------------------------------------------------------------
export const colors: ThemeColors = {
  primary,
  secondary,
  success,
  warning,
  danger,
  info,
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e5e7eb",
  text: {
    primary: "#1f2937",
    secondary: "#6b7280",
    muted: "#9ca3af",
    inverse: "#ffffff",
  },
};

export default colors;
