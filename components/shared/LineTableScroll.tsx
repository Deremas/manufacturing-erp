"use client";

import type { CSSProperties, ReactNode } from "react";

export function LineTableScroll({
  minWidth,
  fullWidth = false,
  children,
}: {
  minWidth: number;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fullWidth ? "erp-table-scroll erp-table-scroll--full" : "erp-table-scroll"}>
      <div
        style={
          {
            minWidth: fullWidth ? minWidth || undefined : minWidth,
            width: fullWidth ? "100%" : "max-content",
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}
