import { notFound } from "next/navigation";

import { formatStockIssueNumber } from "@/app/inventory/_lib/requisition-number";
import RequisitionDetailView from "@/features/inventory/pages/RequisitionDetailView";
import { formatStoreRequisitionNumber } from "@/app/inventory/_lib/requisition-number";
import {
  getInventoryApprovalHistory,
  getInventoryAuditTrail,
  getInventoryDocumentHistory,
} from "@/services/inventory/inventory-insights.service";
import { getIssueById, getRequisitionById } from "@/services/inventory/inventory-documents.service";

const ROUTE_KEY = "inventory.requisition" as const;

export async function renderRequisitionDetail(documentKey: string) {
  const requisition = await getRequisitionById(documentKey);
  if (!requisition) notFound();

  const [approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getInventoryApprovalHistory(ROUTE_KEY, requisition.id),
    getInventoryDocumentHistory(ROUTE_KEY, requisition.id),
    getInventoryAuditTrail(requisition.id, ROUTE_KEY),
  ]);

  const relatedIssueIds = documentHistory
    .filter((entry) => entry.action === "GENERATE_ISSUE" && entry.comment)
    .map((entry) => entry.comment as string);
  const relatedIssues = (await Promise.all(
    relatedIssueIds.map(async (issueId) => {
      const issue = await getIssueById(issueId);
      if (!issue) return null;
      return {
        id: issue.id,
        publicId: issue.publicId,
        issueNo: formatStockIssueNumber(issue.issueNo),
        status: issue.status,
        issueDate: issue.issueDate,
        createdByName: issue.createdByName,
      };
    }),
  )).filter(Boolean) as Array<{
    id: string;
    publicId: number;
    issueNo: string;
    status: string;
    issueDate: string;
    createdByName: string;
  }>;

  return (
    <RequisitionDetailView
      requisition={{
        id: requisition.id,
        publicId: requisition.publicId,
        requisitionNo: formatStoreRequisitionNumber(requisition.requisitionNo),
        requisitionDate: requisition.requisitionDate,
        requestedByName: requisition.requestedByName,
        fromLocationName: requisition.fromLocationName,
        toLocationName: requisition.toLocationName,
        toDepartmentName: requisition.toDepartmentName,
        assignedApproverName: requisition.assignedApproverName,
        remarks: requisition.remarks,
        status: requisition.status,
        items: requisition.items,
      }}
      approvalHistory={approvalHistory.map((entry) => ({
        status: entry.status,
        requestedBy: entry.requestedByName,
        assignedApprover: entry.assignedApproverName ?? undefined,
        approvedBy: entry.approvedByName ?? undefined,
        comment: entry.comment ?? undefined,
        createdAt: entry.createdAt,
      }))}
      documentHistory={documentHistory.map((entry) => ({
        action: entry.action,
        performedBy: entry.performedByName ?? undefined,
        comment: entry.comment ?? undefined,
        createdAt: entry.createdAt,
      }))}
      auditTrail={auditTrail.map((entry) => ({
        action: entry.action,
        user: entry.userName ?? undefined,
        timestamp: entry.timestamp,
      }))}
      relatedIssues={relatedIssues}
      approveEndpoint={requisition.status === "SUBMITTED" ? `/api/inventory/srv/${requisition.id}/approve` : undefined}
      rejectEndpoint={requisition.status === "SUBMITTED" ? `/api/inventory/srv/${requisition.id}/reject` : undefined}
      cancelEndpoint={
        requisition.status === "DRAFT" || requisition.status === "SUBMITTED" || requisition.status === "APPROVED"
          ? `/api/inventory/srv/${requisition.id}/cancel`
          : undefined
      }
      generateIssueEndpoint={
        requisition.status === "APPROVED" || requisition.status === "PARTIALLY_ISSUED"
          ? `/api/inventory/srv/${requisition.id}/generate-issue`
          : undefined
      }
    />
  );
}
