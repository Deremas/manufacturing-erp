import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { PurchaseRequisitionEditor } from "@/features/procurement/document-pages";

export default async function CreatePurchaseRequisitionPage() {
  const referenceData = await getProcurementReferenceData();

  return (
    <PurchaseRequisitionEditor
      mode="create"
      title="Create Purchase Requisition"
      subtitle="Capture an internal buying need and route it through approval before conversion to a purchase order."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Requisitions", href: "/procurement/requisitions" },
        { label: "Create" },
      ]}
      apiBasePath="/api/procurement/requisitions"
      cancelHref="/procurement/requisitions"
      successHref="/procurement/requisitions"
      users={referenceData.users}
      departments={referenceData.departments}
      locations={referenceData.locations}
      items={referenceData.items}
      initialValue={{
        requisitionDate: new Date().toISOString().slice(0, 10),
        requestedById: referenceData.currentUser?.id ?? "",
        departmentId: "",
        locationId: "",
        neededByDate: "",
        purpose: "",
        remarks: "",
        items: [{ itemId: "", uomId: "", requestedQty: 0, approvedQty: 0, estimatedUnitPrice: 0, remarks: "" }],
      }}
    />
  );
}
