import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { TaxCodeDetail } from "@/features/master-data/components";
import { PublicRecordNav } from "@/lib/routing/PublicRecordNav";
import { getTaxCodeById } from "@/lib/master-data-db";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await getTaxCodeById(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        recordKind="md.tax"
        title={record.taxName}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Tax Codes", href: "/master-data/tax-codes" },
          { label: record.taxName },
        ]}
      />
      <PublicRecordNav routeKey="master-data.tax-code" publicId={record.publicId}>
        {({ onEdit, onBack }) => (
          <TaxCodeDetail taxCode={record} onEdit={onEdit} onBack={onBack} />
        )}
      </PublicRecordNav>
    </div>
  );
}
