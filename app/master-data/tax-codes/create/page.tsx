"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { TaxCodeForm } from "@/features/master-data/components";

export default function CreateTaxCodePage() {
  const router = useRouter();

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — persist tax code
    router.push("/master-data/tax-codes");
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
        title="Create Tax Code"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Tax Codes", href: "/master-data/tax-codes" },
          { label: "Create" },
        ]}
      />
      <TaxCodeForm onSubmit={handleSubmit} />
    </div>
  );
}
