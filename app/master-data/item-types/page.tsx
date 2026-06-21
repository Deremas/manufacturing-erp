import { ItemTypesListPage } from "@/features/master-data/item-types";
import { getItemTypes } from "@/lib/master-data-db";

export default async function ItemTypesPage() {
  const itemTypes = await getItemTypes();
  return <ItemTypesListPage initialData={itemTypes} />;
}
