import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { TaxCodeForm } from "@/features/master-data/components";
import { getTaxCodeById, getTaxTypes } from "@/lib/master-data-db";

interface EditTaxCodeRouteProps {
  params: { id: string };
}

export default async function EditTaxCodeRoute({
  params,
}: EditTaxCodeRouteProps) {
  const { id } = params;
  const [taxCode, taxTypes] = await Promise.all([
    getTaxCodeById(id),
    getTaxTypes(),
  ]);

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
        title={`Edit: ${taxCode.taxName}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Tax Codes", href: "/master-data/tax-codes" },
          { label: taxCode.taxName },
          { label: "Edit" },
        ]}
      />
      <TaxCodeForm initialData={taxCode} taxTypes={taxTypes} />
    </div>
  );
}
