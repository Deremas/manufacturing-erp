"use client";

import React from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";

export interface ModuleLink {
  title: string;
  href: string;
  description?: string;
  icon?: string;
}

export interface ModuleLandingPageProps {
  title: string;
  subtitle?: string;
  description: string;
  links: ModuleLink[];
}

function resolveIcon(iconName: string | undefined, size = 18): React.ReactNode {
  if (!iconName) return null;
  const Icon = (LucideIcons as any)[iconName];
  return Icon ? <Icon size={size} /> : null;
}

export default function ModuleLandingPage({
  title,
  subtitle,
  description,
  links,
}: ModuleLandingPageProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
        padding: `${spacing.page.padding}px`,
      }}
    >
      <PageHeader title={title} subtitle={subtitle} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <div
          style={{
            gridColumn: "1 / -1",
            background:
              "linear-gradient(135deg, rgba(15,139,141,0.08), rgba(15,139,141,0.02))",
            border: `1px solid ${colors.border}`,
            borderRadius: radius.components.card,
            padding: "24px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: typography.fontFamily,
              color: colors.text.secondary,
              lineHeight: "24px",
            }}
          >
            {description}
          </p>
        </div>

        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: "20px",
              borderRadius: radius.components.card,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              textDecoration: "none",
              color: colors.text.primary,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: radius.scale.md,
                backgroundColor: colors.primary[50],
                color: colors.primary[700],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {resolveIcon(link.icon, 18)}
            </div>
            <div>
              <div
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.body.fontSize,
                  fontWeight: typography.weights.semibold,
                  marginBottom: "4px",
                }}
              >
                {link.title}
              </div>
              <div
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.text.secondary,
                  lineHeight: "20px",
                }}
              >
                {link.description ?? "Open this section"}
              </div>
            </div>
          </Link>
        ))}

        {links.length === 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <EmptyState
              title={`${title} is being prepared`}
              message="This module does not have linked sections yet."
            />
          </div>
        )}
      </div>
    </div>
  );
}
