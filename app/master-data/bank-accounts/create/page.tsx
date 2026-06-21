import { PageHeader } from "@/components/shared";
import { BankAccountForm } from "@/features/master-data/components";
import { getBanks } from "@/lib/master-data-db";

export default async function CreateBankAccountPage() {
  const banks = await getBanks();

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
        title="Create Bank Account"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Bank Accounts", href: "/master-data/bank-accounts" },
          { label: "Create" },
        ]}
      />
      <BankAccountForm
        banks={banks}
      />
    </div>
  );
}
