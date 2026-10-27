import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { BankDetail } from "@/features/master-data/components";
import { PublicRecordNav } from "@/lib/routing/PublicRecordNav";
import { getBankById } from "@/lib/master-data-db";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await getBankById(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        recordKind="md.bank"
        title={record.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Banks", href: "/master-data/banks" },
          { label: record.shortName || record.name },
        ]}
      />
      <PublicRecordNav routeKey="master-data.bank" publicId={record.publicId}>
        {({ onEdit, onBack }) => <BankDetail bank={record} onEdit={onEdit} onBack={onBack} />}
      </PublicRecordNav>
    </div>
  );
}
