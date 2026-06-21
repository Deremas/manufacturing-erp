// components/transactions/DocumentAttachments.tsx
// Attachment section for any transaction document.
// Lists attachments and provides upload / delete actions.

"use client";

import { useState, useEffect, useCallback } from "react";
import type { DocumentAttachmentEntry } from "@/services/transactions/types";
import { cn } from "@/lib/utils/cn";

export interface DocumentAttachmentsProps {
  referenceType: string;
  referenceId: string;
  currentUserId?: string;
  className?: string;
}

/**
 * Fetches attachments from the transaction service.
 * TODO: Replace with real API calls.
 */
async function fetchAttachments(
  referenceType: string,
  referenceId: string,
): Promise<DocumentAttachmentEntry[]> {
  const { getAttachments } =
    await import("@/services/transactions/transactionService");
  return getAttachments(referenceType, referenceId);
}

async function uploadFile(
  referenceType: string,
  referenceId: string,
  file: File,
  userId: string,
): Promise<void> {
  // TODO: Replace with real upload — create FormData, POST to API, then record
  const { uploadAttachment } =
    await import("@/services/transactions/transactionService");
  await uploadAttachment({
    referenceType,
    referenceId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    fileUrl: URL.createObjectURL(file), // placeholder local URL
    uploadedById: userId,
  });
}

async function removeAttachment(id: string): Promise<void> {
  // TODO: Replace with API call
  const { deleteAttachment } =
    await import("@/services/transactions/transactionService");
  await deleteAttachment(id);
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

/** Returns an icon character based on mime type. */
function fileIcon(mimeType?: string): string {
  if (!mimeType) return "📄";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.startsWith("video/")) return "🎬";
  return "📄";
}

export function DocumentAttachments({
  referenceType,
  referenceId,
  currentUserId,
  className,
}: DocumentAttachmentsProps) {
  const [attachments, setAttachments] = useState<DocumentAttachmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAttachments(referenceType, referenceId);
      setAttachments(data);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setLoading(false);
    }
  }, [referenceType, referenceId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    setUploading(true);
    try {
      await uploadFile(referenceType, referenceId, file, currentUserId);
      await loadAttachments(); // refresh
    } catch (err) {
      console.error("Failed to upload attachment:", err);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      await removeAttachment(id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete attachment:", err);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Attachments</h3>

        {/* Upload button */}
        {currentUserId && (
          <label className="cursor-pointer rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors disabled:opacity-50">
            {uploading ? "Uploading…" : "Upload"}
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {/* Attachment list */}
      {loading ? (
        <div className="text-sm text-gray-500 italic">
          Loading attachments...
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-sm text-gray-500 italic">No attachments yet.</div>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              {/* File icon */}
              <span className="text-xl shrink-0" aria-hidden="true">
                {fileIcon(att.mimeType)}
              </span>

              {/* File info */}
              <div className="min-w-0 flex-1">
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block"
                >
                  {att.fileName}
                </a>
                <p className="text-xs text-gray-500">
                  {formatFileSize(att.fileSize)}
                  {att.fileSize != null && " · "}
                  by{" "}
                  <span className="font-medium text-gray-700">
                    {att.uploadedByName || att.uploadedBy}
                  </span>
                  {" · "}
                  {formatDate(att.createdAt)}
                </p>
              </div>

              {/* Download link */}
              <a
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
                title="Download"
                aria-label="Download"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>

              {/* Delete button */}
              {currentUserId && att.uploadedBy === currentUserId && (
                <button
                  type="button"
                  onClick={() => handleDelete(att.id)}
                  className="shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                  aria-label="Delete"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DocumentAttachments;
