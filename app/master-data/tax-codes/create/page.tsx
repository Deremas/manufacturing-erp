import { PageHeader } from "@/components/shared";
import { TaxCodeForm } from "@/features/master-data/components";
import { getTaxTypes } from "@/lib/master-data-db";

export default async function CreateTaxCodePage() {
  const taxTypes = await getTaxTypes();

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
        title="Create Tax Code"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Tax Codes", href: "/master-data/tax-codes" },
          { label: "Create" },
        ]}
      />
      <TaxCodeForm taxTypes={taxTypes} />
    </div>
  );
}
