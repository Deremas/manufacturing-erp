"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CustomerForm } from "@/features/master-data/components";
import type { Customer } from "@/features/master-data/types";

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const response = await fetch(`/api/master-data/customers/${params.id}`);
        if (!response.ok) {
          setData(null);
          return;
        }
        const payload = await response.json();
        setData(payload);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadCustomer();
    }
  }, [params.id]);

  const handleSubmit = async (formData: unknown) => {
    const response = await fetch(`/api/master-data/customers/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error("Failed to update customer");
    }

    router.push("/master-data/customers");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Customer not found</div>;
  }

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
        title={`Edit: ${data.name}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Customers", href: "/master-data/customers" },
          { label: data.customerCode },
          { label: "Edit" },
        ]}
      />
      <CustomerForm initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
