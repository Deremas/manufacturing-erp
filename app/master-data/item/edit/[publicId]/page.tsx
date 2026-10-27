import { notFound } from "next/navigation";

import { ItemFormPage } from "@/features/master-data/items";
import { publicViewUrl } from "@/lib/routing/urls";
import { getItemById } from "@/lib/server/item-data";

export default async function MasterDataItemEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const item = await getItemById(publicId);
  if (!item) notFound();

  return (
    <ItemFormPage
      initialData={item}
      isEdit
      submitEndpoint={`/api/master-data/items/${item.id}`}
      successHref={publicViewUrl("master-data.item", item.publicId)}
    />
  );
}
