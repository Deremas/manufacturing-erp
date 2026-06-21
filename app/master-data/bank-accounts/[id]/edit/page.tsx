import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { BankAccountForm } from "@/features/master-data/components";
import { getBankAccountById, getBanks } from "@/lib/master-data-db";

interface EditBankAccountRouteProps {
  params: Promise<{ id: string }>;
}

export default async function EditBankAccountRoute({
  params,
}: EditBankAccountRouteProps) {
  const { id } = await params;
  const [bankAccount, banks] = await Promise.all([
    getBankAccountById(id),
    getBanks(),
  ]);

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
        title={`Edit: ${bankAccount.accountName}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Bank Accounts", href: "/master-data/bank-accounts" },
          { label: bankAccount.accountCode },
          { label: "Edit" },
        ]}
      />
      <BankAccountForm
        initialData={bankAccount}
        banks={banks}
      />
    </div>
  );
}
