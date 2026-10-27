import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { DepartmentForm } from "@/features/master-data/components";
import { getDepartmentById } from "@/lib/master-data-db";

export default async function MasterDataDepartmentEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const department = await getDepartmentById(publicId);
  if (!department) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={`Edit: ${department.name}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Departments", href: "/master-data/departments" },
          { label: department.code },
          { label: "Edit" },
        ]}
      />
      <DepartmentForm initialData={department} />
    </div>
  );
}
