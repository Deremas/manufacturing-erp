"use client";

import type { ReactNode } from "react";

import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import { sectionIconForTitle } from "./section-icon";

export function SectionHeading({
  title,
  subtitle,
  icon,
  extra,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  extra?: ReactNode;
}) {
  const resolvedIcon = icon ?? sectionIconForTitle(title);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 12,
        marginBottom: 16,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
          flexWrap: "wrap",
        }}
      >
        {resolvedIcon ? (
          <span
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: colors.primary[50],
              color: colors.primary[700],
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {resolvedIcon}
          </span>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.h6.fontSize,
              lineHeight: typography.sizes.h6.lineHeight,
              fontWeight: typography.weights.semibold,
              color: colors.primary[700],
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                margin: "3px 0 0",
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.caption.fontSize,
                lineHeight: typography.sizes.caption.lineHeight,
                color: colors.text.secondary,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {extra ? <div style={{ flexShrink: 0 }}>{extra}</div> : null}
    </div>
  );
}
