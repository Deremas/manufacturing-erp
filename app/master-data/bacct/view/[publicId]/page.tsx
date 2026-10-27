import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared";
import { BankAccountDetail } from "@/features/master-data/components";
import { PublicRecordNav } from "@/lib/routing/PublicRecordNav";
import { getBankAccountById } from "@/lib/master-data-db";

export default async function MasterDataViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const record = await getBankAccountById(publicId);
  if (!record) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
      <PageHeader
        recordKind="md.bank-account"
        title={record.accountName}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Bank Accounts", href: "/master-data/bank-accounts" },
          { label: record.accountCode },
        ]}
      />
      <PublicRecordNav routeKey="master-data.bank-account" publicId={record.publicId}>
        {({ onEdit, onBack }) => (
          <BankAccountDetail bankAccount={record} onEdit={onEdit} onBack={onBack} />
        )}
      </PublicRecordNav>
    </div>
  );
}
