import { getProductionReferenceData } from "@/app/production/_lib/reference-data";
import { BomEditor } from "@/features/production/document-pages";

export default async function CreateBomPage() {
  const referenceData = await getProductionReferenceData();

  return (
    <BomEditor
      mode="create"
      title="Create BOM"
      subtitle="Define the finished-good recipe, expected output, and required production components."
      breadcrumbs={[
        { label: "Production", href: "/production" },
        { label: "Bill of Materials", href: "/production/bom" },
        { label: "Create" },
      ]}
      apiBasePath="/api/production/bom"
      cancelHref="/production/bom"
      successHref="/production/bom"
      finishedGoods={referenceData.finishedGoods}
      components={referenceData.components}
      units={referenceData.units}
      initialValue={{
        bomName: "",
        finishedGoodId: "",
        outputQty: 1,
        uomId: "",
        isDefault: false,
        status: "ACTIVE",
        description: "",
        items: [{ componentItemId: "", uomId: "", quantity: 0, wastagePercent: 0, required: true }],
      }}
    />
  );
}
