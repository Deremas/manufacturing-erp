"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { SupplierForm } from "@/features/master-data/components";

export default function CreateSupplierPage() {
  const router = useRouter();

  const handleSubmit = async (data: unknown) => {
    const response = await fetch("/api/master-data/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create supplier");
    }

    router.push("/master-data/suppliers");
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
        title="Create Supplier"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Suppliers", href: "/master-data/suppliers" },
          { label: "Create" },
        ]}
      />
      <SupplierForm onSubmit={handleSubmit} />
    </div>
  );
}
