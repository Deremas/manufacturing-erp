import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CategoryDetail } from "@/features/master-data/components";
import { getCategoryById } from "@/lib/master-data-db";

interface CategoryPageProps {
  params: { id: string };
}

export default async function CategoryDetailPage({
  params,
}: CategoryPageProps) {
  const category = await getCategoryById(params.id);

  if (!category) {
    notFound();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        padding: "24px",
      }}
    >
      <PageHeader
        title={category.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Categories", href: "/master-data/categories" },
          { label: category.name },
        ]}
      />
      <CategoryDetail category={category} />
    </div>
  );
}
