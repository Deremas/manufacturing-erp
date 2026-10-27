// components/transactions/DocumentTimeline.tsx
// Vertical timeline showing document history / audit trail.

import { HistoryActionBadge } from "@/components/shared";
import type { DocumentHistoryEntry } from "@/services/transactions/types";
import { cn } from "@/lib/utils/cn";

export interface DocumentTimelineProps {
  history: DocumentHistoryEntry[];
  className?: string;
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
                  <HistoryActionBadge action={entry.action} label={actionLabel(entry.action)} />
                  <div className="min-w-0 flex-1">
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

export default DocumentTimeline;
