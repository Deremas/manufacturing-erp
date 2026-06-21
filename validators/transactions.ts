// validators/transactions.ts
// Zod schemas for Transaction Engine inputs.

import { z } from "zod";

// ─── Comment ──────────────────────────────────────────────────────────────────

export const addCommentSchema = z.object({
  referenceType: z.string().min(1, "Reference type is required"),
  referenceId: z.string().min(1, "Reference ID is required"),
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment must be at most 5 000 characters"),
  createdById: z.string().min(1, "User ID is required"),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

// ─── Attachment metadata ─────────────────────────────────────────────────────

export const addAttachmentSchema = z.object({
  referenceType: z.string().min(1, "Reference type is required"),
  referenceId: z.string().min(1, "Reference ID is required"),
  fileName: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name too long"),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
  fileUrl: z.string().url("Invalid file URL").min(1, "File URL is required"),
  uploadedById: z.string().min(1, "User ID is required"),
});

export type AddAttachmentInput = z.infer<typeof addAttachmentSchema>;

// ─── History ──────────────────────────────────────────────────────────────────

export const addHistorySchema = z.object({
  referenceType: z.string().min(1, "Reference type is required"),
  referenceId: z.string().min(1, "Reference ID is required"),
  action: z.string().min(1, "Action is required"),
  fieldName: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  comment: z.string().max(5000).optional(),
  performedById: z.string().min(1, "User ID is required"),
});

export type AddHistoryInput = z.infer<typeof addHistorySchema>;

// ─── Document status action (submit / approve / reject / etc.) ──────────────

export const statusActionSchema = z.object({
  referenceType: z.string().min(1, "Reference type is required"),
  referenceId: z.string().min(1, "Reference ID is required"),
  userId: z.string().min(1, "User ID is required"),
  notes: z.string().max(2000).optional(),
});

export type StatusActionInput = z.infer<typeof statusActionSchema>;
