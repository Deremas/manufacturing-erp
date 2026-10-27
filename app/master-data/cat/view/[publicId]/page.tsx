import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { CategoryDetail } from "@/features/master-data/components";
import { PublicRecordNav } from "@/lib/routing/PublicRecordNav";
import { getCategoryById } from "@/lib/master-data-db";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await getCategoryById(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        recordKind="md.category"
        title={record.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Categories", href: "/master-data/categories" },
          { label: record.name },
        ]}
      />
      <PublicRecordNav routeKey="master-data.category" publicId={record.publicId}>
        {({ onEdit, onBack }) => (
          <CategoryDetail category={record} onEdit={onEdit} onBack={onBack} />
        )}
      </PublicRecordNav>
    </div>
  );
}
