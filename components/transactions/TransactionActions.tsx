// components/transactions/TransactionActions.tsx
// Action buttons bar for any transaction document.
// Shows available actions based on the document's current status.

"use client";

import type { DocumentStatus } from "@/services/transactions/types";
import { getAvailableActions } from "@/services/transactions/transactionService";
import { cn } from "@/lib/utils/cn";

export interface TransactionActionsProps {
  status: DocumentStatus;
  onAction: (action: string) => void;
  className?: string;
  /** If true, buttons are disabled (e.g. while saving). */
  disabled?: boolean;
}

/**
 * Returns Tailwind classes for each action button variant.
 */
function actionButtonStyle(action: string): string {
  const styles: Record<string, string> = {
    Submit:
      "bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600",
    Approve:
      "bg-green-600 text-white hover:bg-green-500 focus-visible:outline-green-600",
    Reject:
      "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600",
    Resubmit:
      "bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600",
    Post: "bg-teal-600 text-white hover:bg-teal-500 focus-visible:outline-teal-600",
    Void: "bg-gray-700 text-white hover:bg-gray-600 focus-visible:outline-gray-700",
    Print:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
    Export:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
  };
  return styles[action] ?? "bg-gray-600 text-white hover:bg-gray-500";
}

export function TransactionActions({
  status,
  onAction,
  className,
  disabled = false,
}: TransactionActionsProps) {
  const actions = getAvailableActions(status);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm transition-colors",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            actionButtonStyle(action),
          )}
        >
          {action === "Approve" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {action === "Reject" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {action === "Print" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {action}
        </button>
      ))}
    </div>
  );
}

export default TransactionActions;
