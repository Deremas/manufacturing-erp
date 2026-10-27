"use client";

import type { ReactNode } from "react";
import {
  Archive,
  Ban,
  CheckCircle2,
  CircleCheck,
  CircleDot,
  CircleX,
  Download,
  FilePlus2,
  PackageCheck,
  Pencil,
  Printer,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";

import { colors } from "@/components/ui/colors";

export function historyActionKey(action: string) {
  return action.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function historyActionLabel(action: string) {
  switch (historyActionKey(action)) {
    case "CREATE":
    case "CREATED":
      return "Created";
    case "UPDATE":
    case "UPDATED":
    case "EDIT":
      return "Updated";
    case "SUBMIT":
    case "SUBMITTED":
      return "Submitted";
    case "POST":
    case "POSTED":
      return "Posted";
    case "APPROVE":
    case "APPROVED":
      return "Approved";
    case "REJECT":
    case "REJECTED":
      return "Rejected";
    case "CANCEL":
    case "CANCELLED":
    case "CANCELED":
      return "Cancelled";
    case "VOID":
    case "VOIDED":
      return "Voided";
    case "GENERATE_ISSUE":
    case "ISSUED":
      return "Issued";
    case "PENDING":
    case "PENDING_APPROVAL":
      return "Pending Approval";
    case "ASSIGN":
    case "ASSIGNED":
      return "Assigned";
    case "DELETE":
    case "DELETED":
      return "Deleted";
    case "ARCHIVE":
    case "ARCHIVED":
      return "Archived";
    case "PRINT":
    case "PRINTED":
      return "Printed";
    case "EXPORT":
    case "EXPORTED":
      return "Exported";
    default:
      return action
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

export function historyActionMeta(action: string): { icon: ReactNode; fg: string; bg: string } {
  switch (historyActionKey(action)) {
    case "CREATE":
    case "CREATED":
      return { icon: <FilePlus2 size={13} />, fg: "#4b5563", bg: "#f3f4f6" };
    case "UPDATE":
    case "UPDATED":
    case "EDIT":
      return { icon: <Pencil size={13} />, fg: "#b45309", bg: "#fef3c7" };
    case "SUBMIT":
    case "SUBMITTED":
    case "PENDING":
    case "PENDING_APPROVAL":
      return { icon: <Send size={13} />, fg: "#0f766e", bg: "#ccfbf1" };
    case "POST":
    case "POSTED":
      return { icon: <CircleCheck size={13} />, fg: "#0f766e", bg: "#ccfbf1" };
    case "APPROVE":
    case "APPROVED":
      return { icon: <CheckCircle2 size={13} />, fg: "#15803d", bg: "#dcfce7" };
    case "REJECT":
    case "REJECTED":
      return { icon: <CircleX size={13} />, fg: "#dc2626", bg: "#fee2e2" };
    case "CANCEL":
    case "CANCELLED":
    case "CANCELED":
    case "VOID":
    case "VOIDED":
      return { icon: <Ban size={13} />, fg: "#6b7280", bg: "#f3f4f6" };
    case "GENERATE_ISSUE":
    case "ISSUED":
      return { icon: <PackageCheck size={13} />, fg: colors.primary[700], bg: "#dff3f1" };
    case "ASSIGN":
    case "ASSIGNED":
      return { icon: <UserPlus size={13} />, fg: "#1d4ed8", bg: "#dbeafe" };
    case "DELETE":
    case "DELETED":
      return { icon: <Trash2 size={13} />, fg: "#dc2626", bg: "#fee2e2" };
    case "ARCHIVE":
    case "ARCHIVED":
      return { icon: <Archive size={13} />, fg: "#1d4ed8", bg: "#dbeafe" };
    case "PRINT":
    case "PRINTED":
      return { icon: <Printer size={13} />, fg: "#4b5563", bg: "#f3f4f6" };
    case "EXPORT":
    case "EXPORTED":
      return { icon: <Download size={13} />, fg: "#4b5563", bg: "#f3f4f6" };
    default:
      return { icon: <CircleDot size={13} />, fg: colors.primary[700], bg: "#dff3f1" };
  }
}

export function HistoryActionBadge({
  action,
  label,
}: {
  action: string;
  label?: string;
}) {
  const meta = historyActionMeta(action);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: meta.bg,
          color: meta.fg,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {meta.icon}
      </span>
      <span>{label ?? historyActionLabel(action)}</span>
    </span>
  );
}
