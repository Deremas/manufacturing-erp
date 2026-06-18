"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { CustomerForm } from "@/features/master-data/components";
import type { Customer } from "@/features/master-data/types";

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: API integration — fetch customer by ID
    setData({
      id: params.id as string,
      customerCode: "CUST-001",
      name: "ABC Corporation",
      phone: "+254 712 345 678",
      email: "info@abccorp.com",
      address: "123 Industrial Area, Nairobi",
      creditLimit: 500000,
      paymentTerms: "net_30",
      isActive: true,
    } as Customer);
    setLoading(false);
  }, [params.id]);

  const handleSubmit = async (_data: unknown) => {
    // TODO: API integration — update customer
    router.push("/master-data/customers");
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>Loading…</div>;
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
