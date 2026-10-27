"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CustomerForm } from "@/features/master-data/components";
import { publicViewUrlFromPayload } from "@/lib/routing/urls";

export default function CreateCustomerPage() {
  const router = useRouter();

  const handleSubmit = async (data: unknown) => {
    const response = await fetch("/api/master-data/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; publicId?: number }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to create customer");
    }

    router.push(publicViewUrlFromPayload("master-data.customer", payload, "/master-data/customers"));
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
        title="Create Customer"
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Customers", href: "/master-data/customers" },
          { label: "Create" },
        ]}
      />
      <CustomerForm onSubmit={handleSubmit} />
    </div>
  );
}
