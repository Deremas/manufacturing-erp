import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { SupplierDetail } from "@/features/master-data/components";
import { PublicRecordNav } from "@/lib/routing/PublicRecordNav";
import { getSupplierById } from "@/lib/master-data-db";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await getSupplierById(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        recordKind="md.supplier"
        title={record.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Suppliers", href: "/master-data/suppliers" },
          { label: record.supplierCode },
        ]}
      />
      <PublicRecordNav routeKey="master-data.supplier" publicId={record.publicId}>
        {({ onEdit, onBack }) => (
          <SupplierDetail supplier={record} onEdit={onEdit} onBack={onBack} />
        )}
      </PublicRecordNav>
    </div>
  );
}
