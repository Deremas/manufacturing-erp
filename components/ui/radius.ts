// ----------------------------------------------------------------------------
// NEW ERP — Border Radius Constants
// ----------------------------------------------------------------------------
// Reusable radius tokens mapped to common component types.

export interface RadiusScale {
  /** 6 px — Small radius (checkboxes, tags, small elements) */
  sm: string;
  /** 8 px — Medium radius (buttons, inputs, cards) */
  md: string;
  /** 12 px — Large radius (modals, drawers, larger panels) */
  lg: string;
  /** 16 px — Extra-large radius (sheets, bottom panels) */
  xl: string;
  /** 9999 px — Fully rounded (badges, pills, avatars) */
  full: string;
}

export interface ComponentRadii {
  /** Border radius for card containers (16 px) */
  card: string;
  /** Border radius for buttons (8 px) */
  button: string;
  /** Border radius for input fields (8 px) */
  input: string;
  /** Border radius for badges / pills (9999 px) */
  badge: string;
}

export interface RadiusConfig {
  scale: RadiusScale;
  components: ComponentRadii;
}

export const radius: RadiusConfig = {
  scale: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },
  components: {
    card: "16px",
    button: "8px",
    input: "8px",
    badge: "9999px",
  },
};

export default radius;
