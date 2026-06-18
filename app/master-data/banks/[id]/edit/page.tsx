"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { BankForm } from "@/features/master-data/components";
import type { Bank } from "@/features/master-data/types";

export default function EditBankPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Bank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch bank by ID
    setData({
      id: params.id as string,
      name: "Kenya Commercial Bank",
      shortName: "KCB",
      isActive: true,
    } as Bank);
    setLoading(false);
  }, [params.id]);

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — update bank
    router.push("/master-data/banks");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Bank not found</div>;
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
          { label: "Banks", href: "/master-data/banks" },
          { label: data.shortName },
          { label: "Edit" },
        ]}
      />
      <BankForm initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
