import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { TaxCodeDetail } from "@/features/master-data/components";
import { getTaxCodeById } from "@/lib/master-data-db";

interface TaxCodeDetailRouteProps {
  params: { id: string };
}

export default async function TaxCodeDetailRoute({
  params,
}: TaxCodeDetailRouteProps) {
  const { id } = params;
  const taxCode = await getTaxCodeById(id);

  if (!taxCode) {
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
        title={taxCode.taxName}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Tax Codes", href: "/master-data/tax-codes" },
          { label: taxCode.taxName },
        ]}
      />
      <TaxCodeDetail taxCode={taxCode} />
    </div>
  );
}
