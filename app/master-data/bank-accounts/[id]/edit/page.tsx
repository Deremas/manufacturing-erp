"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { BankAccountForm } from "@/features/master-data/components";
import type { BankAccount } from "@/features/master-data/types";

export default function EditBankAccountPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch bank account by ID
    setData({
      id: params.id as string,
      accountCode: "BA-001",
      accountName: "KCB Current Account",
      accountType: "current",
      bankId: "bank-1",
      bankName: "Kenya Commercial Bank",
      accountNumber: "1234567890",
      branch: "Moi Avenue",
      swiftCode: "KCBLKENX",
      currency: "KES",
      openingBalance: 100000,
      currentBalance: 250000,
      isActive: true,
    } as BankAccount);
    setLoading(false);
  }, [params.id]);

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — update bank account
    router.push("/master-data/bank-accounts");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
  }

  if (!data) {
    return <div style={{ padding: "24px" }}>Bank Account not found</div>;
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
        title={`Edit: ${data.accountName}`}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data" },
          { label: "Bank Accounts", href: "/master-data/bank-accounts" },
          { label: data.accountCode },
          { label: "Edit" },
        ]}
      />
      <BankAccountForm initialData={data} onSubmit={handleSubmit} />
    </div>
  );
}
