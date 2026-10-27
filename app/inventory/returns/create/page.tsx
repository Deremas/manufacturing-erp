import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { sql } from "@/lib/db";
import { peekNextDocumentNumber } from "@/lib/document-numbering";
import { formatStockIssueNumber, formatStockReturnNumber } from "@/app/inventory/_lib/requisition-number";
import { getIssueById, listIssues } from "@/services/inventory/inventory-documents.service";

export default async function CreateReturnRoute() {
  const [referenceData, nextReturnNo, issues] = await Promise.all([
    getInventoryReferenceData(),
    peekNextDocumentNumber(sql, "RET", "Stock Return"),
    listIssues(),
  ]);
  const eligibleIssues = issues.filter((issue) => issue.status === "POSTED" || issue.status === "APPROVED" || issue.status === "ISSUED");
  const issueDetailsEntries = await Promise.all(
    eligibleIssues.map(async (issue) => {
      const detail = await getIssueById(issue.id);
      return detail ? ([issue.id, detail] as const) : null;
    }),
  );
  const issueDetailsById = Object.fromEntries(
    issueDetailsEntries.filter(Boolean) as Array<readonly [string, NonNullable<Awaited<ReturnType<typeof getIssueById>>>]>,
  );

  return (
    <InventoryDocumentEditor
      kind="return"
      mode="create"
      routeKey="inventory.return"
      title="Create Return Voucher"
      subtitle="Return unused materials to store. Select the issue voucher the material was issued on."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Returns", href: "/inventory/returns" },
        { label: "Create" },
      ]}
      apiBasePath="/api/inventory/returns"
      cancelHref="/inventory/returns"
      successHref="/inventory/returns"
      initialValue={{ returnNo: formatStockReturnNumber(nextReturnNo) }}
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
      issues={eligibleIssues.map((issue) => ({
        value: issue.id,
        label: `${formatStockIssueNumber(issue.issueNo)} | ${issue.locationName} | ${issue.issuedToName} | ${new Date(issue.issueDate).toLocaleDateString("en-KE")} | ${issue.itemCount} item(s)`,
      }))}
      issueDetailsById={issueDetailsById}
    />
  );
}
