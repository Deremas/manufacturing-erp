// components/transactions/TransactionLayout.tsx
// Standard layout wrapper for all transaction document pages.
// Provides a consistent header + status badge + action buttons + content area.

import type { ReactNode } from "react";
import type { DocumentStatus } from "@/services/transactions/types";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { TransactionActions } from "./TransactionActions";
import { cn } from "@/lib/utils/cn";

export interface TransactionLayoutProps {
  /** Page title (e.g. "Purchase Order") */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Document number (e.g. "PO-2026-0001") */
  documentNumber?: string;
  /** Current document status */
  status: DocumentStatus;
  /** Main page content */
  children: ReactNode;
  /** Action buttons — rendered next to the status badge */
  actions?: ReactNode;
  /** Callback fired when an action button is clicked */
  onAction?: (action: string) => void;
  /** Additional classes for the wrapper */
  className?: string;
}

export function TransactionLayout({
  title,
  subtitle,
  documentNumber,
  status,
  children,
  actions,
  onAction,
  className,
}: TransactionLayoutProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: title / subtitle / doc number */}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {title}
            </h1>
            {(subtitle || documentNumber) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                {subtitle && <span>{subtitle}</span>}
                {documentNumber && (
                  <>
                    {subtitle && <span aria-hidden="true">·</span>}
                    <span className="font-mono font-medium text-gray-700">
                      {documentNumber}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: status badge + actions */}
          <div className="flex flex-col items-end gap-3">
            <DocumentStatusBadge status={status} size="md" />

            {actions ? (
              actions
            ) : onAction ? (
              <TransactionActions status={status} onAction={onAction} />
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div>{children}</div>
    </div>
  );
}

export default TransactionLayout;
