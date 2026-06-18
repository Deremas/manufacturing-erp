"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { TaxCodeForm } from "@/features/master-data/components";
import type { TaxCode } from "@/features/master-data/types";

export default function EditTaxCodePage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<TaxCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch tax code by ID
    setData({
      id: params.id as string,
      taxName: "VAT 16%",
      taxType: "vat",
      rate: 16,
      isActive: true,
    } as TaxCode);
    setLoading(false);
  }, [params.id]);

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — update tax code
    router.push("/master-data/tax-codes");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Tax Code not found</div>;
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
        title={`Edit: ${data.taxName}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Tax Codes", href: "/master-data/tax-codes" },
          { label: data.taxName },
          { label: "Edit" },
        ]}
      />
      <TaxCodeForm initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
