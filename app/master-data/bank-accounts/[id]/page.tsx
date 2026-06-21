import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { BankAccountDetail } from "@/features/master-data/components";
import { getBankAccountById } from "@/lib/master-data-db";

interface BankAccountDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function BankAccountDetailRoute({
  params,
}: BankAccountDetailRouteProps) {
  const { id } = await params;
  const bankAccount = await getBankAccountById(id);

  if (!bankAccount) {
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
        title={bankAccount.accountName}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Bank Accounts", href: "/master-data/bank-accounts" },
          { label: bankAccount.accountCode },
        ]}
      />
      <BankAccountDetail bankAccount={bankAccount} />
    </div>
  );
}
