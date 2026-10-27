import ShiftReconciliationPage, { type ReconciliationCheck } from "@/features/production/shift-sessions/ShiftReconciliationPage";
import { loadShift } from "@/app/production/shift-sessions/[id]/_lib/load-session";

export const dynamic = "force-dynamic";

function openCount(rows: Array<{ status: string }>) {
  return rows.filter((row) => !["POSTED", "CANCELLED"].includes(String(row.status).toUpperCase())).length;
}

export default async function ReconciliationRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await loadShift(id, "/reconciliation");
  const openIssues = openCount(session.issues);
  const openReturns = openCount(session.returns);
  const produced = session.batches.reduce((sum, row) => sum + Number(row.producedQty ?? 0), 0);
  const accepted = session.batches.reduce((sum, row) => sum + Number(row.acceptedQty ?? 0), 0);
  const rejected = session.batches.reduce((sum, row) => sum + Number(row.rejectedQty ?? 0), 0);
  const waste = session.batches.reduce((sum, row) => sum + Number(row.wastageQty ?? 0), 0);
  const outputGap = Math.abs(produced - (accepted + rejected + waste));
  const checks: ReconciliationCheck[] = [
    {
      label: "Production output recorded",
      result: session.batches.length > 0 ? "Passed" : "Warning",
      detail: session.batches.length > 0 ? `${session.batches.length} output batches are on this shift.` : "No finished output is recorded. Closure is still allowed.",
    },
    {
      label: "Material documents posted",
      result: openIssues + openReturns > 0 ? "Blocking" : session.issues.length + session.returns.length > 0 ? "Passed" : "Not Applicable",
      detail: openIssues + openReturns > 0 ? `${openIssues} issues and ${openReturns} returns are still unposted.` : "No unposted material documents.",
    },
    {
      label: "Consumption variance reviewed",
      result: "Not Applicable",
      detail: "A saved variance review is not part of this shift yet.",
    },
    {
      label: "Wastage recorded",
      result: waste > 0 ? "Passed" : "Not Applicable",
      detail: waste > 0 ? "Waste quantities are stored on the output batches." : "No waste quantity is recorded.",
    },
    {
      label: "WIP reconciled",
      result: "Warning",
      detail: "Closing the shift does not post a WIP snapshot. Use the WIP balance for the live ledger.",
    },
    {
      label: "QC decisions completed",
      result: session.qcTests.some((row) => String(row.result).toUpperCase() === "PENDING") ? "Warning" : session.qcTests.length ? "Passed" : "Not Applicable",
      detail: session.qcTests.length ? `${session.qcTests.length} QC records are linked.` : "No QC tests are linked to this shift.",
    },
    {
      label: "Accepted output accounted for",
      result: session.batches.length === 0 ? "Not Applicable" : outputGap < 0.001 ? "Passed" : "Warning",
      detail: session.batches.length === 0 ? "No output to account for." : `Produced ${produced}, accepted ${accepted}, rejected ${rejected}, waste ${waste}.`,
    },
    {
      label: "Required signatures collected",
      result: "Not Applicable",
      detail: "No closure signature roles are configured.",
    },
  ];

  return (
    <ShiftReconciliationPage
      sessionId={session.id}
      publicId={session.publicId}
      sessionNo={session.sessionNo}
      status={session.status}
      checks={checks}
    />
  );
}
