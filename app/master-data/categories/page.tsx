import { CategoriesListPage } from "@/features/master-data/categories";
import { getCategories } from "@/lib/master-data-db";

export default async function MasterDataCategoriesPage() {
  const categories = await getCategories();
  return <CategoriesListPage initialData={categories} />;
}
