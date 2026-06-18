"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { BankAccountForm } from "@/features/master-data/components";

export default function CreateBankAccountPage() {
  const router = useRouter();

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — persist bank account
    router.push("/master-data/bank-accounts");
  };

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
      <BankAccountForm onSubmit={handleSubmit} />
    </div>
  );
}
