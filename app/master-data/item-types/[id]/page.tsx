import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ItemTypeDetailPage } from "@/features/master-data/item-types";
import { getItemTypeById } from "@/lib/master-data-db";

interface ItemTypePageProps {
  params: { id: string };
}

export default async function ItemTypeDetailRoute({ params }: ItemTypePageProps) {
  const itemType = await getItemTypeById(params.id);

  if (!itemType) {
    notFound();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={itemType.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Item Types", href: "/master-data/item-types" },
          { label: itemType.name },
        ]}
      />
      <ItemTypeDetailPage itemType={itemType} />
    </div>
  );
}
