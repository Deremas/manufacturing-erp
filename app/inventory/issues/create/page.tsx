import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { getRequisitionById, listRequisitions } from "@/services/inventory/inventory-documents.service";
import { sql } from "@/lib/db";
import { peekNextDocumentNumber } from "@/lib/document-numbering";

export default async function CreateIssueRoute() {
  const [referenceData, requisitions] = await Promise.all([
    getInventoryReferenceData(),
    listRequisitions(),
  ]);
  const nextIssueNo = await peekNextDocumentNumber(sql, "ISS", "Stock Issue");
  const approvedRequisitions = requisitions.filter((requisition) => requisition.status === "APPROVED" || requisition.status === "PARTIALLY_ISSUED");
  const requisitionDetailsEntries = await Promise.all(
    approvedRequisitions.map(async (requisition) => {
      const detail = await getRequisitionById(requisition.id);
      return detail ? [requisition.id, detail] as const : null;
    }),
  );
  const requisitionDetailsById = Object.fromEntries(requisitionDetailsEntries.filter(Boolean) as Array<readonly [string, NonNullable<Awaited<ReturnType<typeof getRequisitionById>>>]>);

  return (
    <InventoryDocumentEditor
      kind="issue"
      mode="create"
      routeKey="inventory.issue"
      title="Create Stock Issue"
      subtitle="Record items leaving store through a proper stock issue document."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Issues", href: "/inventory/issues" },
        { label: "Create" },
      ]}
      apiBasePath="/api/inventory/issues"
      cancelHref="/inventory/issues"
      successHref="/inventory/issues"
      initialValue={{ issueNo: nextIssueNo }}
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
      requisitions={approvedRequisitions
        .map((requisition) => ({
          value: String(requisition.id),
          label: `${requisition.requisitionNo} - ${requisition.toDepartmentName ?? requisition.toLocationName ?? "Unassigned"}`,
          sourceLocationId: requisition.fromLocationId ?? undefined,
          issueToId: requisition.toDepartmentId ?? requisition.toLocationId ?? undefined,
        }))}
      requisitionDetailsById={requisitionDetailsById}
    />
  );
}
