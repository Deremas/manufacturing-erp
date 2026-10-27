import { notFound } from "next/navigation";
import { getProductionReferenceData } from "@/app/production/_lib/reference-data";
import { BomEditor } from "@/features/production/document-pages";
import { publicViewUrl } from "@/lib/routing";
import { getBomById } from "@/services/production/bom.service";

export default async function EditBomPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const [referenceData, bom] = await Promise.all([getProductionReferenceData(), getBomById(publicId)]);
  if (!bom) notFound();
  return (
    <BomEditor
      mode="edit"
      documentId={bom.id}
      title={`Edit ${bom.bomNo}`}
      subtitle="Adjust the BOM header or component mix while keeping the recipe on the live production tables."
      breadcrumbs={[
        { label: "Production", href: "/production" },
        { label: "Bill of Materials", href: "/production/bom" },
        { label: bom.bomNo, href: publicViewUrl("production.bom", bom.publicId) },
        { label: "Edit" },
      ]}
      apiBasePath="/api/production/bom"
      cancelHref={publicViewUrl("production.bom", bom.publicId)}
      successHref="/production/bom"
      finishedGoods={referenceData.finishedGoods}
      components={referenceData.components}
      units={referenceData.units}
      initialValue={{
        bomName: bom.bomName,
        finishedGoodId: bom.finishedGoodId,
        outputQty: Number(bom.outputQty),
        uomId: bom.uomId ?? "",
        isDefault: bom.isDefault,
        status: bom.status,
        description: bom.description ?? "",
        items: bom.items.map((item) => ({
          componentItemId: item.componentItemId,
          uomId: item.uomId ?? "",
          quantity: Number(item.quantity),
          wastagePercent: Number(item.wastagePercent),
          required: item.required,
        })),
      }}
    />
  );
}
