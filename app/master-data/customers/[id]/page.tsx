import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CustomerDetail } from "@/features/master-data/components";
import { getCustomerById } from "@/lib/master-data-db";

interface CustomerPageProps {
  params: { id: string };
}

export default async function CustomerDetailPage({
  params,
}: CustomerPageProps) {
  const customer = await getCustomerById(params.id);

  if (!customer) {
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
        title={customer.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Customers", href: "/master-data/customers" },
          { label: customer.customerCode },
        ]}
      />
      <CustomerDetail customer={customer} />
    </div>
  );
}
