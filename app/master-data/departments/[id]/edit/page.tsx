import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { DepartmentForm } from "@/features/master-data/components";
import { getDepartmentById } from "@/lib/master-data-db";

interface EditDepartmentRouteProps {
  params: { id: string };
}

export default async function EditDepartmentRoute({
  params,
}: EditDepartmentRouteProps) {
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
