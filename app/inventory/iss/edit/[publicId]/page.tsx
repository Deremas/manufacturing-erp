import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { formatStockIssueNumber } from "@/app/inventory/_lib/requisition-number";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { publicListUrl, publicViewUrl } from "@/lib/routing/urls";
import { getIssueById } from "@/services/inventory/inventory-documents.service";

const ROUTE_KEY = "inventory.issue" as const;

export default async function IssueEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [issue, referenceData] = await Promise.all([
    getIssueById(publicId),
    getInventoryReferenceData(),
  ]);

  if (!issue) notFound();

  return (
    <InventoryDocumentEditor
      kind="issue"
      mode="edit"
      documentId={issue.id}
      documentPublicId={issue.publicId}
      routeKey={ROUTE_KEY}
      title={`Edit ${formatStockIssueNumber(issue.issueNo)}`}
      subtitle="Update the stock issue before posting it."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Issues", href: "/inventory/issues" },
        { label: formatStockIssueNumber(issue.issueNo), href: publicViewUrl(ROUTE_KEY, issue.publicId) },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/issues"
      cancelHref={publicViewUrl(ROUTE_KEY, issue.publicId)}
      successHref={publicListUrl(ROUTE_KEY)}
      canEdit={issue.status !== "POSTED" && issue.status !== "CANCELLED"}
      initialValue={{
        issueNo: formatStockIssueNumber(issue.issueNo),
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
