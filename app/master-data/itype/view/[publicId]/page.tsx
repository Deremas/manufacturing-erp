import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { ItemTypeDetailPage } from "@/features/master-data/item-types";
import { PublicRecordNav } from "@/lib/routing/PublicRecordNav";
import { getItemTypeById } from "@/lib/master-data-db";

export default async function MasterDataItemTypeViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const itemType = await getItemTypeById(publicId);
  if (!itemType) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        recordKind="md.item-type"
        title={itemType.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Item Types", href: "/master-data/item-types" },
          { label: itemType.name },
        ]}
      />
      <PublicRecordNav routeKey="master-data.item-type" publicId={itemType.publicId}>
        {({ onEdit, onBack }) => (
          <ItemTypeDetailPage itemType={itemType} onEdit={onEdit} onBack={onBack} />
        )}
      </PublicRecordNav>
    </div>
  );
}
