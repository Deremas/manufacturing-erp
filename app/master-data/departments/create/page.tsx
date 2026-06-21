import { PageHeader } from "@/components/shared";
import { DepartmentForm } from "@/features/master-data/components";

export default async function CreateDepartmentPage() {
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
        title="Create Department"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Departments", href: "/master-data/departments" },
          { label: "Create" },
        ]}
      />
      <DepartmentForm />
    </div>
  );
}
