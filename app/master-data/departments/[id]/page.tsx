import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { DepartmentDetail } from "@/features/master-data/components";
import { getDepartmentById } from "@/lib/master-data-db";

interface DepartmentDetailRouteProps {
  params: { id: string };
}

export default async function DepartmentDetailRoute({
  params,
}: DepartmentDetailRouteProps) {
  const { id } = params;
  const department = await getDepartmentById(id);

  if (!department) {
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
        title={department.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Departments", href: "/master-data/departments" },
          { label: department.code },
        ]}
      />
      <DepartmentDetail department={department} />
    </div>
  );
}
