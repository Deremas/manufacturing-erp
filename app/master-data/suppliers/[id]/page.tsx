import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { SupplierDetail } from "@/features/master-data/components";
import { getSupplierById } from "@/lib/master-data-db";

interface SupplierPageProps {
  params: { id: string };
}

export default async function SupplierDetailPage({
  params,
}: SupplierPageProps) {
  const supplier = await getSupplierById(params.id);

  if (!supplier) {
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
        title={supplier.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Suppliers", href: "/master-data/suppliers" },
          { label: supplier.supplierCode },
        ]}
      />
      <SupplierDetail supplier={supplier} />
    </div>
  );
}
