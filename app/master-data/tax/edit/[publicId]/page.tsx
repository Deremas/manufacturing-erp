import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { TaxCodeForm } from "@/features/master-data/components";
import { getTaxCodeById, getTaxTypes } from "@/lib/master-data-db";

export default async function MasterDataTaxCodeEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [taxCode, taxTypes] = await Promise.all([
    getTaxCodeById(publicId),
    getTaxTypes(),
  ]);
  if (!taxCode) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
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
