// components/transactions/DocumentComments.tsx
// Comment section for any transaction document.
// Fetches comments by referenceType + referenceId and allows adding / deleting.

"use client";

import { useState, useEffect, useCallback } from "react";
import type { DocumentCommentEntry } from "@/services/transactions/types";
import { cn } from "@/lib/utils/cn";

export interface DocumentCommentsProps {
  referenceType: string;
  referenceId: string;
  currentUserId?: string;
  className?: string;
}

/**
 * Fetches comments from the transaction service.
 * TODO: Replace with real API calls.
 */
async function fetchComments(
  referenceType: string,
  referenceId: string,
): Promise<DocumentCommentEntry[]> {
  // TODO: Replace with fetch() or SWR/React Query call
  const { getComments } =
    await import("@/services/transactions/transactionService");
  return getComments(referenceType, referenceId);
}

async function createComment(
  referenceType: string,
  referenceId: string,
  content: string,
  userId: string,
): Promise<void> {
  // TODO: Replace with API call
  const { addComment } =
    await import("@/services/transactions/transactionService");
  await addComment({
    referenceType,
    referenceId,
    content,
    createdById: userId,
  });
}

async function removeComment(id: string): Promise<void> {
  // TODO: Replace with API call
  const { deleteComment } =
    await import("@/services/transactions/transactionService");
  await deleteComment(id);
}

export function DocumentComments({
  referenceType,
  referenceId,
  currentUserId,
  className,
}: DocumentCommentsProps) {
  const [comments, setComments] = useState<DocumentCommentEntry[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchComments(referenceType, referenceId);
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  }, [referenceType, referenceId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || !currentUserId) return;

    setSubmitting(true);
    try {
      await createComment(referenceType, referenceId, text, currentUserId);
      setNewComment("");
      await loadComments(); // refresh
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await removeComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  }

  function formatDate(date: Date): string {
    try {
      return new Intl.DateTimeFormat("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(date));
    } catch {
      return String(date);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-base font-semibold text-gray-900">Comments</h3>

      {/* Comment list */}
      {loading ? (
        <div className="text-sm text-gray-500 italic">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-gray-500 italic">No comments yet.</div>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {comment.createdByName || comment.createdBy}
                    </span>
                    {" · "}
                    {formatDate(comment.createdAt)}
                  </p>
                </div>

                {/* Delete button — only for own comments */}
                {currentUserId && comment.createdBy === currentUserId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    className="shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="Delete comment"
                    title="Delete"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add comment form */}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="flex items-start gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment…"
            rows={2}
            maxLength={5000}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Sending…" : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}

export default DocumentComments;
