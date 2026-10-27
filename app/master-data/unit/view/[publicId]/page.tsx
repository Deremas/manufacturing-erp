import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { UnitDetail } from "@/features/master-data/components";
import { PublicRecordNav } from "@/lib/routing/PublicRecordNav";
import { getUnitById } from "@/lib/master-data-db";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await getUnitById(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        recordKind="md.unit"
        title={record.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Units", href: "/master-data/units" },
          { label: record.code || record.name },
        ]}
      />
      <PublicRecordNav routeKey="master-data.unit" publicId={record.publicId}>
        {({ onEdit, onBack }) => <UnitDetail unit={record} onEdit={onEdit} onBack={onBack} />}
      </PublicRecordNav>
    </div>
  );
}
