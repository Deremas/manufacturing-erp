import { PageHeader } from "@/components/shared";
import { BankForm } from "@/features/master-data/components";

export default async function CreateBankPage() {
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
        title="Create Bank"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Banks", href: "/master-data/banks" },
          { label: "Create" },
        ]}
      />
      <BankForm />
    </div>
  );
}
