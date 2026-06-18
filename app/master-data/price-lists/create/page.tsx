"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { PriceListForm } from "@/features/master-data/components";

export default function CreatePriceListPage() {
  const router = useRouter();

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — persist price list entry
    router.push("/master-data/price-lists");
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
        title="Create Price List"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Price Lists", href: "/master-data/price-lists" },
          { label: "Create" },
        ]}
      />
      <PriceListForm onSubmit={handleSubmit} />
    </div>
  );
}
