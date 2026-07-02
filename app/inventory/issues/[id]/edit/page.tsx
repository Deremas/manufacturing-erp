import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getIssueById } from "@/services/inventory/inventory-documents.service";

export default async function EditIssueRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [issue, referenceData] = await Promise.all([
    getIssueById(id),
    getInventoryReferenceData(),
  ]);

  if (!issue) notFound();

  return (
    <InventoryDocumentEditor
      kind="issue"
      mode="edit"
      documentId={issue.id}
      title={`Edit ${issue.issueNo}`}
      subtitle="Update the stock issue before posting it."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Issues", href: "/inventory/issues" },
        { label: issue.issueNo, href: `/inventory/issues/${issue.id}` },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/issues"
      cancelHref={`/inventory/issues/${issue.id}`}
      successHref="/inventory/issues"
      canEdit={issue.status !== "POSTED" && issue.status !== "CANCELLED"}
      initialValue={{
        issueDate: issue.issueDate.slice(0, 10),
        locationId: issue.locationId,
        issuedToType: issue.issuedToType,
        issuedToId: issue.issuedToId,
        purpose: issue.purpose,
        approverId: issue.assignedApproverId ?? "",
        remarks: issue.remarks,
        items: issue.items,
      }}
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
    />
  );
}
