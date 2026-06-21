// components/transactions/DocumentTimeline.tsx
// Vertical timeline showing document history / audit trail.

import type { DocumentHistoryEntry } from "@/services/transactions/types";
import { cn } from "@/lib/utils/cn";

export interface DocumentTimelineProps {
  history: DocumentHistoryEntry[];
  className?: string;
}

/** Maps action to an icon character (you can replace with an icon component later). */
function actionIcon(action: string): string {
  const icons: Record<string, string> = {
    CREATED: "●",
    UPDATED: "✎",
    SUBMITTED: "⇧",
    APPROVED: "✓",
    REJECTED: "✗",
    POSTED: "►",
    VOIDED: "⊘",
    CANCELLED: "✕",
    ARCHIVED: "📦",
    PRINTED: "⎙",
    EXPORTED: "⬇",
  };
  return icons[action] ?? "○";
}

/** Returns a human-readable action label. */
function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATED: "Document created",
    UPDATED: "Document updated",
    SUBMITTED: "Submitted for approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    POSTED: "Posted to ledger",
    VOIDED: "Voided",
    CANCELLED: "Cancelled",
    ARCHIVED: "Archived",
    PRINTED: "Printed",
    EXPORTED: "Exported",
  };
  return labels[action] ?? action;
}

/** Format a date for timeline display. */
function formatDateTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  } catch {
    return String(date);
  }
}

export function DocumentTimeline({
  history,
  className,
}: DocumentTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div
        className={cn(
          "text-sm text-gray-500 italic py-4 text-center",
          className,
        )}
      >
        No history recorded yet.
      </div>
    );
  }

  return (
    <div className={cn("flow-root", className)}>
      <ul role="list" className="-mb-8">
        {history.map((entry, idx) => {
          const isLast = idx === history.length - 1;
          return (
            <li key={entry.id}>
              <div className="relative pb-8">
                {/* Vertical connector line */}
                {!isLast && (
                  <span
                    className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}

                <div className="relative flex items-start gap-4">
                  {/* Icon */}
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-inset ring-gray-200 text-sm",
                      getActionBg(entry.action),
                      getActionText(entry.action),
                    )}
                  >
                    {actionIcon(entry.action)}
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {actionLabel(entry.action)}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      by{" "}
                      <span className="font-medium text-gray-700">
                        {entry.performedByName || entry.performedBy}
                      </span>
                      {" · "}
                      {formatDateTime(entry.createdAt)}
                    </div>

                    {/* Field change details */}
                    {entry.fieldName && (
                      <div className="mt-1 text-xs text-gray-600">
                        <span className="font-medium">{entry.fieldName}</span>:
                        {entry.oldValue != null && (
                          <span className="line-through text-gray-400 ml-1">
                            {entry.oldValue}
                          </span>
                        )}
                        {entry.newValue != null && (
                          <span className="ml-1 font-medium text-gray-800">
                            {entry.newValue}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Comment */}
                    {entry.comment && (
                      <div className="mt-1.5 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600 italic border border-gray-100">
                        “{entry.comment}”
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function getActionBg(action: string): string {
  const map: Record<string, string> = {
    CREATED: "bg-blue-100",
    APPROVED: "bg-green-100",
    REJECTED: "bg-red-100",
    VOIDED: "bg-gray-100",
    CANCELLED: "bg-gray-100",
    POSTED: "bg-teal-100",
    ARCHIVED: "bg-blue-100",
  };
  return map[action] ?? "bg-gray-100";
}

function getActionText(action: string): string {
  const map: Record<string, string> = {
    CREATED: "text-blue-700",
    APPROVED: "text-green-700",
    REJECTED: "text-red-700",
    VOIDED: "text-gray-700",
    CANCELLED: "text-gray-500",
    POSTED: "text-teal-700",
    ARCHIVED: "text-blue-700",
  };
  return map[action] ?? "text-gray-600";
}

export default DocumentTimeline;
