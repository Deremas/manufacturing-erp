"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { BankForm } from "@/features/master-data/components";

export default function CreateBankPage() {
  const router = useRouter();

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — persist bank
    router.push("/master-data/banks");
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
        title="Create Bank"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Banks", href: "/master-data/banks" },
          { label: "Create" },
        ]}
      />
      <BankForm onSubmit={handleSubmit} />
    </div>
  );
}
