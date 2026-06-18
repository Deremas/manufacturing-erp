"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ItemForm } from "@/features/master-data/components";

export default function CreateItemPage() {
  const router = useRouter();

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — persist item
    router.push("/master-data/items");
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
        title="Create Item"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Items", href: "/master-data/items" },
          { label: "Create" },
        ]}
      />
      <ItemForm onSubmit={handleSubmit} />
    </div>
  );
}
