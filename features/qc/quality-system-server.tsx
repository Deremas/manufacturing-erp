import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/auth";
import { QCCorrectiveActionFormPage, QCCorrectiveActionListPage } from "@/features/qc/components/QCCorrectiveAction";
import { QCInternalAuditFormPage, QCInternalAuditListPage } from "@/features/qc/components/QCInternalAudit";
import { QCManagementReviewFormPage, QCManagementReviewListPage } from "@/features/qc/components/QCManagementReview";
import {
  QCCipFormPage,
  QCCipListPage,
  QCHoldFormPage,
  QCHoldListPage,
  QCRetentionFormPage,
  QCRetentionListPage,
} from "@/features/qc/components/QCRelatedRecords";
import { getOperationalQcContext } from "@/services/qc/qc-context.service";
import {
  getCipRecord,
  getCorrectiveAction,
  getHoldDecision,
  getInternalAudit,
  getManagementReview,
  getRetentionSample,
  listCipRecords,
  listCorrectiveActions,
  listHoldDecisions,
  listInternalAudits,
  listManagementReviews,
  listRetentionSamples,
} from "@/services/qc/qc-quality-system.service";

async function options() {
  const user = await getCurrentUser();
  try {
    return await getOperationalQcContext("packaging", null, user?.accessibleLocationIds);
  } catch {
    return { shifts: [], locations: [], items: [], users: [], assets: [], suppliers: [] as Array<{ value: string; label: string }> };
  }
}

export async function CipList() {
  const rows = await listCipRecords();
  return <QCCipListPage rows={rows} />;
}

export async function CipForm({ id, mode }: { id?: string; mode?: "create" | "edit" | "view" }) {
  const [record, ctx] = await Promise.all([id ? getCipRecord(id) : null, options()]);
  if (id && !record) notFound();
  return (
    <QCCipFormPage
      mode={mode ?? (id ? "view" : "create")}
      record={record}
      options={{ shifts: ctx.shifts, locations: ctx.locations, assets: ctx.assets }}
    />
  );
}

export async function RetentionList() {
  const rows = await listRetentionSamples();
  return <QCRetentionListPage rows={rows} />;
}

export async function RetentionForm({ id, mode }: { id?: string; mode?: "create" | "edit" | "view" }) {
  const [record, ctx] = await Promise.all([id ? getRetentionSample(id) : null, options()]);
  if (id && !record) notFound();
  return (
    <QCRetentionFormPage
      mode={mode ?? (id ? "view" : "create")}
      record={record}
      options={{ items: ctx.items, shifts: ctx.shifts }}
    />
  );
}

export async function HoldList() {
  const rows = await listHoldDecisions();
  return <QCHoldListPage rows={rows} />;
}

export async function HoldForm({ id, mode }: { id?: string; mode?: "create" | "edit" | "view" }) {
  const [record, ctx] = await Promise.all([id ? getHoldDecision(id) : null, options()]);
  if (id && !record) notFound();
  return (
    <QCHoldFormPage
      mode={mode ?? (id ? "view" : "create")}
      record={record}
      options={{ items: ctx.items, shifts: ctx.shifts, locations: ctx.locations }}
    />
  );
}

export async function ReviewList() {
  const rows = await listManagementReviews();
  return <QCManagementReviewListPage rows={rows} />;
}

export async function ReviewForm({ id, mode }: { id?: string; mode?: "create" | "edit" | "view" }) {
  const record = id ? await getManagementReview(id) : null;
  if (id && !record) notFound();
  return <QCManagementReviewFormPage mode={mode ?? (id ? "view" : "create")} record={record} />;
}

export async function AuditList() {
  const rows = await listInternalAudits();
  return <QCInternalAuditListPage rows={rows} />;
}

export async function AuditForm({ id, mode }: { id?: string; mode?: "create" | "edit" | "view" }) {
  const record = id ? await getInternalAudit(id) : null;
  if (id && !record) notFound();
  return <QCInternalAuditFormPage mode={mode ?? (id ? "view" : "create")} record={record} />;
}

export async function CapaList() {
  const rows = await listCorrectiveActions();
  return <QCCorrectiveActionListPage rows={rows} />;
}

export async function CapaForm({ id, mode }: { id?: string; mode?: "create" | "edit" | "view" }) {
  const record = id ? await getCorrectiveAction(id) : null;
  if (id && !record) notFound();
  return <QCCorrectiveActionFormPage mode={mode ?? (id ? "view" : "create")} record={record} />;
}
