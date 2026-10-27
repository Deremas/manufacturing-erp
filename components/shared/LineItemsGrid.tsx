"use client";

import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";

import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

import { LineTableScroll } from "./LineTableScroll";

export const lineItemsGridHeaderCellStyle: CSSProperties = {
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  paddingBottom: 2,
  whiteSpace: "nowrap",
};

export const lineItemsGridSpanStyle: CSSProperties = {
  width: "100%",
};

const LineItemsGridContext = createContext({
  template: "",
  columnGap: 12,
  alignItems: "center" as CSSProperties["alignItems"],
});

type LineItemsGridProps = {
  template: string;
  headers: ReactNode[];
  minWidth?: number;
  scroll?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  headerAlign?: CSSProperties["textAlign"];
  headerStyle?: CSSProperties;
  alignItems?: CSSProperties["alignItems"];
  columnGap?: number;
  children: ReactNode;
};

export function LineItemsGrid({
  template,
  headers,
  minWidth = 0,
  scroll = true,
  fullWidth = false,
  compact = false,
  headerAlign,
  headerStyle,
  alignItems = "center",
  columnGap: columnGapProp,
  children,
}: LineItemsGridProps) {
  const columnGap = columnGapProp ?? (compact ? 8 : 12);
  const grid = (
    <LineItemsGridContext.Provider value={{ template, columnGap, alignItems }}>
      <div
        className={fullWidth ? "erp-line-items-grid erp-line-items-grid--full" : "erp-line-items-grid"}
        style={{
          display: "grid",
          gridTemplateColumns: template,
          columnGap,
          alignItems,
          padding: "0 4px",
        }}
      >
        {headers.map((header, index) => (
          <div
            key={index}
            style={{
              ...lineItemsGridHeaderCellStyle,
              ...(compact ? { paddingBottom: 0 } : null),
              ...(headerAlign ? { textAlign: headerAlign } : null),
              ...headerStyle,
            }}
          >
            {header}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 4 : 8, padding: "0 4px" }}>
        {children}
      </div>
    </LineItemsGridContext.Provider>
  );

  if (!scroll) {
    return grid;
  }

  return <LineTableScroll minWidth={minWidth} fullWidth={fullWidth}>{grid}</LineTableScroll>;
}

export function LineItemsGridRow({ children }: { children: ReactNode }) {
  const { template, columnGap, alignItems } = useContext(LineItemsGridContext);

  return (
    <div
      className="erp-line-items-row"
      style={{
        display: "grid",
        gridTemplateColumns: template,
        columnGap,
        alignItems,
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

export function LineItemsGridSpan({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <div style={{ ...lineItemsGridSpanStyle, ...style }}>{children}</div>;
}
