"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { SupplierForm } from "@/features/master-data/components";
import type { Supplier } from "@/features/master-data/types";

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSupplier = async () => {
      try {
        const response = await fetch(`/api/master-data/suppliers/${params.id}`);
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
      loadSupplier();
    }
  }, [params.id]);

  const handleSubmit = async (formData: unknown) => {
    const response = await fetch(`/api/master-data/suppliers/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error("Failed to update supplier");
    }

    router.push("/master-data/suppliers");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading...</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Supplier not found</div>;
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
          { label: "Suppliers", href: "/master-data/suppliers" },
          { label: data.supplierCode },
          { label: "Edit" },
        ]}
      />
      <SupplierForm initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
