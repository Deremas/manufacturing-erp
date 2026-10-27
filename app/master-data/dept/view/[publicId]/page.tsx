import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { DepartmentDetail } from "@/features/master-data/components";
import { PublicRecordNav } from "@/lib/routing/PublicRecordNav";
import { getDepartmentById } from "@/lib/master-data-db";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await getDepartmentById(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        recordKind="md.department"
        title={record.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Departments", href: "/master-data/departments" },
          { label: record.code },
        ]}
      />
      <PublicRecordNav routeKey="master-data.department" publicId={record.publicId}>
        {({ onEdit, onBack }) => (
          <DepartmentDetail department={record} onEdit={onEdit} onBack={onBack} />
        )}
      </PublicRecordNav>
    </div>
  );
}
