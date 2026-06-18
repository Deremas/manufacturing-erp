// ----------------------------------------------------------------------------
// NEW ERP — Spacing Constants
// ----------------------------------------------------------------------------
// Single source of truth for padding, gap and layout dimensions.
// All values are in pixels (px). Consumers can convert to rem if needed.

export interface PageSpacing {
  /** Horizontal + vertical padding for page-level containers (24–32 px) */
  padding: number;
  /** Gap between major page sections */
  gap: number;
}

export interface CardSpacing {
  /** Inner padding for card containers (20–24 px) */
  padding: number;
  /** Gap between card children */
  gap: number;
}

export interface SectionSpacing {
  /** Gap between section header and content */
  gap: number;
}

export interface FormSpacing {
  /** Gap between form fields / groups */
  gap: number;
}

export interface LayoutDimensions {
  /** Width of the sidebar / navigation rail (px) */
  sidebarWidth: number;
  /** Height of the top navigation bar (px) */
  topbarHeight: number;
}

export interface SpacingConfig {
  page: PageSpacing;
  card: CardSpacing;
  section: SectionSpacing;
  form: FormSpacing;
  layout: LayoutDimensions;
}

export const spacing: SpacingConfig = {
  page: {
    padding: 24,
    gap: 24,
  },
  card: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 24,
  },
  form: {
    gap: 16,
  },
  layout: {
    sidebarWidth: 260,
    topbarHeight: 64,
  },
};

export default spacing;
