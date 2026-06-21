// services/transactions/types.ts
// Shared types for the Transaction Engine — used by every document type.

export type DocumentStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "POSTED"
  | "VOIDED"
  | "CANCELLED"
  | "ARCHIVED";

export interface TransactionDocument {
  id: string;
  documentNumber: string;
  status: DocumentStatus;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  // All transaction documents share these
}

export interface DocumentHistoryEntry {
  id: string;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  performedBy: string;
  performedByName: string;
  createdAt: Date;
}

export interface DocumentCommentEntry {
  id: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

export interface DocumentAttachmentEntry {
  id: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: Date;
}
