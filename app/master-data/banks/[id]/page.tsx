import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { BankDetail } from "@/features/master-data/components";
import { getBankById } from "@/lib/master-data-db";

interface BankDetailRouteProps {
  params: { id: string };
}

export default async function BankDetailRoute({ params }: BankDetailRouteProps) {
  const { id } = params;
  const bank = await getBankById(id);

  if (!bank) {
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
        title={bank.name}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Banks", href: "/master-data/banks" },
          { label: bank.shortName },
        ]}
      />
      <BankDetail bank={bank} />
    </div>
  );
}
