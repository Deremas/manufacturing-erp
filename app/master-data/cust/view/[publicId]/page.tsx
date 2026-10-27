import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { CustomerDetail } from "@/features/master-data/components";
import { PublicRecordNav } from "@/lib/routing/PublicRecordNav";
import { getCustomerById } from "@/lib/master-data-db";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await getCustomerById(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        recordKind="md.customer"
        title={record.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Customers", href: "/master-data/customers" },
          { label: record.customerCode },
        ]}
      />
      <PublicRecordNav routeKey="master-data.customer" publicId={record.publicId}>
        {({ onEdit, onBack }) => (
          <CustomerDetail customer={record} onEdit={onEdit} onBack={onBack} />
        )}
      </PublicRecordNav>
    </div>
  );
}
