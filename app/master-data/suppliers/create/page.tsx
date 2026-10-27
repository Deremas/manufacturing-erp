"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { SupplierForm } from "@/features/master-data/components";
import { publicViewUrlFromPayload } from "@/lib/routing/urls";

export default function CreateSupplierPage() {
  const router = useRouter();

  const handleSubmit = async (data: unknown) => {
    const response = await fetch("/api/master-data/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; publicId?: number }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to create supplier");
    }

    router.push(publicViewUrlFromPayload("master-data.supplier", payload, "/master-data/suppliers"));
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
