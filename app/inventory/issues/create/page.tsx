import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";

export default async function CreateIssueRoute() {
  const referenceData = await getInventoryReferenceData();

  return (
    <InventoryDocumentEditor
      kind="issue"
      mode="create"
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
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
    />
  );
}
