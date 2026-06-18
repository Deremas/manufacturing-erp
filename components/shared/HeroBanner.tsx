"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface HeroBannerProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const bannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "16px",
  padding: "32px",
  background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[800]} 100%)`,
  borderRadius: "18px",
  color: colors.text.inverse,
};

const leftSectionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const iconWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "48px",
  height: "48px",
  borderRadius: radius.scale.md,
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  color: colors.text.inverse,
  fontSize: "24px",
  flexShrink: 0,
};

const textContainerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const titleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h3.fontSize,
  lineHeight: typography.sizes.h3.lineHeight,
  fontWeight: typography.weights.semibold,
  color: colors.text.inverse,
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  lineHeight: typography.sizes.body.lineHeight,
  color: "rgba(255, 255, 255, 0.8)",
  margin: 0,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function HeroBanner({
  title,
  subtitle,
  icon,
  actions,
}: HeroBannerProps) {
  return (
    <div style={bannerStyle}>
      <div style={leftSectionStyle}>
        {icon && <div style={iconWrapperStyle}>{icon}</div>}
        <div style={textContainerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={actionsStyle}>{actions}</div>}
    </div>
  );
}
