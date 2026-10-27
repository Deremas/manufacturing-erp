import { notFound } from "next/navigation";

import { ItemDetailPage } from "@/features/master-data/items";
import { publicEditUrl } from "@/lib/routing/urls";
import { getItemById } from "@/lib/server/item-data";

export default async function MasterDataItemViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const item = await getItemById(publicId);
  if (!item) notFound();

  return (
    <ItemDetailPage
      item={item}
      editHref={publicEditUrl("master-data.item", item.publicId)}
      backHref="/master-data/items"
    />
  );
}
