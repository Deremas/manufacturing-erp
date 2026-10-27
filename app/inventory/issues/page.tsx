import { InventoryDocumentListPage } from "@/features/inventory/live/document-pages";
import { formatStockIssueNumber } from "@/app/inventory/_lib/requisition-number";
import { listIssues } from "@/services/inventory/inventory-documents.service";

export default async function IssuesRoute() {
  const issues = await listIssues();

  return (
    <InventoryDocumentListPage
      title="Stock Issues"
      subtitle="Issue inventory to departments and operational modules through controlled documents."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Issues" },
      ]}
      createHref="/inventory/issues/create"
      rows={issues.map((issue) => ({
        id: issue.id,
        publicId: issue.publicId,
        number: formatStockIssueNumber(issue.issueNo),
        date: issue.issueDate,
        status: issue.status,
        itemCount: issue.itemCount,
        primaryText: issue.issuedToName,
        secondaryText: issue.locationName,
        ownerText: issue.createdByName,
      }))}
      searchPlaceholder="Search issue number, recipient, location, or status..."
      primaryColumnLabel="Issued To"
      secondaryColumnLabel="Location"
      ownerColumnLabel="Created By"
      routeKey="inventory.issue"
    />
  );
}
