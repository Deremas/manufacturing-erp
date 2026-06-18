// ----------------------------------------------------------------------------
// NEW ERP — Typography Configuration
// ----------------------------------------------------------------------------
// Font family, size scale, and weight tokens consumed by the design system.

export interface FontSizeEntry {
  fontSize: string;
  lineHeight: string;
  /** Optional letter-spacing, e.g. for uppercase labels */
  letterSpacing?: string;
}

export type FontWeight = "light" | "regular" | "medium" | "semibold" | "bold";

export interface TypographyConfig {
  /** Primary font stack */
  fontFamily: string;
  sizes: {
    /** Heading 1 — largest heading */
    h1: FontSizeEntry;
    /** Heading 2 */
    h2: FontSizeEntry;
    /** Heading 3 */
    h3: FontSizeEntry;
    /** Heading 4 */
    h4: FontSizeEntry;
    /** Heading 5 */
    h5: FontSizeEntry;
    /** Heading 6 */
    h6: FontSizeEntry;
    /** Body / paragraph text */
    body: FontSizeEntry;
    /** Small / helper text */
    small: FontSizeEntry;
    /** Caption / footnote text */
    caption: FontSizeEntry;
  };
  weights: Record<FontWeight, number>;
}

export const typography: TypographyConfig = {
  fontFamily: "Inter, sans-serif",

  sizes: {
    h1: { fontSize: "32px", lineHeight: "40px", letterSpacing: "-0.02em" },
    h2: { fontSize: "28px", lineHeight: "36px", letterSpacing: "-0.015em" },
    h3: { fontSize: "24px", lineHeight: "32px", letterSpacing: "-0.01em" },
    h4: { fontSize: "20px", lineHeight: "28px" },
    h5: { fontSize: "18px", lineHeight: "26px" },
    h6: { fontSize: "16px", lineHeight: "24px" },
    body: { fontSize: "14px", lineHeight: "22px" },
    small: { fontSize: "13px", lineHeight: "20px" },
    caption: { fontSize: "12px", lineHeight: "18px" },
  },

  weights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export default typography;
