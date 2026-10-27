import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { BankForm } from "@/features/master-data/components";
import { getBankById } from "@/lib/master-data-db";

export default async function MasterDataBankEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const bank = await getBankById(publicId);
  if (!bank) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        title={`Edit: ${bank.name}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Banks", href: "/master-data/banks" },
          { label: bank.shortName },
          { label: "Edit" },
        ]}
      />
      <BankForm initialData={bank} />
    </div>
  );
}
